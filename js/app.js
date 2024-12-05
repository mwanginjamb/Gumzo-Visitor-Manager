class VisitorManagementApp {
    constructor() {
        this.db = new VisitorDB();
        this.currentVisitor = null;
        this.visitsData = []; // Store visits data for filtering
        this.durationUpdateInterval = null;
        this.init();
    }

    async init() {
        try {
            await this.db.dbReady;
            this.initializeEventListeners();
            await this.loadVisitorList();
        } catch (error) {
            this.showAlert('Error initializing database. Please refresh the page.', 'danger');
        }
    }

    initializeEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.showPage(e.target.dataset.page);
            });
        });

        // Search and Filter
        document.getElementById('searchVisitor').addEventListener('input', (e) => {
            this.filterVisits();
        });

        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.filterVisits();
        });

        // Form submission
        document.getElementById('visitorForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleVisitorRegistration();
        });

        // Add item row
        document.getElementById('addItemRow').addEventListener('click', () => {
            this.addItemRow();
        });

        // Mark egress
        document.getElementById('markEgress').addEventListener('click', () => {
            this.markVisitorEgress();
        });
    }

    filterVisits() {
        const searchTerm = document.getElementById('searchVisitor').value.toLowerCase();
        const statusFilter = document.getElementById('statusFilter').value;

        let filteredVisits = this.visitsData;

        // Apply status filter
        if (statusFilter !== 'all') {
            filteredVisits = filteredVisits.filter(visit => {
                if (statusFilter === 'active') return !visit.egressTime;
                if (statusFilter === 'egressed') return visit.egressTime;
                return true;
            });
        }

        // Apply search filter
        if (searchTerm) {
            filteredVisits = filteredVisits.filter(visit => 
                visit.visitor.fullName.toLowerCase().includes(searchTerm) ||
                visit.visitor.idNumber.toLowerCase().includes(searchTerm) ||
                visit.visitor.cellNumber.toLowerCase().includes(searchTerm)
            );
        }

        // Sort by ingress time
        filteredVisits.sort((a, b) => new Date(b.ingressTime) - new Date(a.ingressTime));

        this.renderVisitorList(filteredVisits);
    }

    showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => {
            page.style.display = 'none';
        });
        document.getElementById(pageId).style.display = 'block';
    }

    async searchVisitors(query) {
        if (query.length < 2) {
            await this.loadVisitorList();
            return;
        }

        const visitors = await this.db.searchVisitors(query);
        this.renderVisitorList(visitors);
    }

    async handleVisitorRegistration() {
        const form = document.getElementById('visitorForm');
        const formData = new FormData(form);
        
        const visitorData = {
            fullName: formData.get('fullName'),
            idNumber: formData.get('idNumber'),
            cellNumber: formData.get('cellNumber'),
            purpose: formData.get('purpose'),
        };

        const items = this.collectItemsData();

        const visitData = {
            visitorId: visitorData.idNumber,
            ingressTime: new Date().toISOString(),
            items: items,
            purpose: visitorData.purpose,
            egressTime: null
        };

        console.log('Visitor Data:', visitorData);
        console.log('Visit Data:', visitData);

        // Wrap in async IIFE to use await
        (async () => {
            try {
                // Check if visitor exists
                const existingVisitor = await this.db.getVisitor(visitorData.idNumber);
                if (!existingVisitor) {
                    await this.db.addVisitor(visitorData);
                }

                await this.db.addVisit(visitData);
                
                form.reset();
                document.getElementById('itemsBody').innerHTML = '';
                this.showPage('visitor-list');
                await this.loadVisitorList();
                
                this.showAlert('Visitor registered successfully!', 'success');
            } catch (error) {
                console.error('Error registering visitor:', error);
                this.showAlert('Error registering visitor: ' + error.message, 'danger');
            }
        })();
    }

    collectItemsData() {
        const items = [];
        const rows = document.querySelectorAll('#itemsBody tr');
        
        rows.forEach(row => {
            const item = {
                name: row.querySelector('[name="itemName"]').value,
                identifier: row.querySelector('[name="itemIdentifier"]').value,
                type: row.querySelector('[name="itemType"]').value
            };
            if (item.name && item.identifier) {
                items.push(item);
            }
        });

        return items;
    }

    addItemRow() {
        const tbody = document.getElementById('itemsBody');
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="text" class="form-control" name="itemName" required></td>
            <td><input type="text" class="form-control" name="itemIdentifier" required></td>
            <td>
                <select class="form-select" name="itemType" required>
                    <option value="personal">Personal</option>
                    <option value="company">Company Property</option>
                    <option value="supply">Supply</option>
                    <option value="other">Other</option>
                </select>
            </td>
            <td>
                <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('tr').remove()">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    }

    async loadVisitorList() {
        try {
            console.log('Loading visitor list...');
            const visits = await this.db.getAllVisits();
            console.log('All visits:', visits);
            
            if (!Array.isArray(visits) || visits.length === 0) {
                console.log('No visits found in database');
                const tbody = document.getElementById('visitorListBody');
                tbody.innerHTML = '<tr><td colspan="7" class="text-center">No visits found</td></tr>';
                return;
            }

            const visitorPromises = visits.map(async visit => {
                try {
                    if (!visit.visitorId) {
                        console.error('Visit missing visitorId:', visit);
                        return null;
                    }
                    const visitor = await this.db.getVisitor(visit.visitorId);
                    if (!visitor) {
                        console.error('No visitor found for ID:', visit.visitorId);
                        return null;
                    }
                    console.log('Retrieved visitor:', visitor, 'for visit:', visit);
                    return { ...visit, visitor };
                } catch (error) {
                    console.error('Error getting visitor for visit:', visit, error);
                    return null;
                }
            });
            
            const allVisits = (await Promise.all(visitorPromises)).filter(Boolean);
            console.log('Final processed visits:', allVisits);
            
            if (allVisits.length === 0) {
                console.log('No valid visits after processing');
                const tbody = document.getElementById('visitorListBody');
                tbody.innerHTML = '<tr><td colspan="7" class="text-center">No valid visits found</td></tr>';
                return;
            }
            
            // Store the visits data for filtering
            this.visitsData = allVisits;
            
            // Initial filter application
            this.filterVisits();
        } catch (error) {
            console.error('Error loading visitor list:', error);
            this.showAlert('Error loading visitor list', 'danger');
            const tbody = document.getElementById('visitorListBody');
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error loading visitor list</td></tr>';
        }
    }

    calculateDuration(ingressTime, egressTime = null) {
        const start = moment(ingressTime);
        const end = egressTime ? moment(egressTime) : moment();
        const duration = moment.duration(end.diff(start));
        
        if (egressTime) {
            const hours = Math.floor(duration.asHours());
            const minutes = Math.floor(duration.minutes());
            return `${hours}h ${minutes}m`;
        } else {
            return 'live-duration-' + start.toISOString();
        }
    }

    updateLiveDurations() {
        document.querySelectorAll('[id^="live-duration-"]').forEach(element => {
            const ingressTime = element.getAttribute('data-ingress');
            const duration = moment.duration(moment().diff(moment(ingressTime)));
            const hours = Math.floor(duration.asHours());
            const minutes = Math.floor(duration.minutes());
            const seconds = Math.floor(duration.seconds());
            element.textContent = `${hours}h ${minutes}m ${seconds}s`;
        });
    }

    renderVisitorList(visits) {
        console.log('Rendering visitor list with data:', visits);
        const tbody = document.getElementById('visitorListBody');
        
        if (!tbody) {
            console.error('Could not find visitorListBody element');
            return;
        }

        try {
            tbody.innerHTML = '';

            if (!visits || visits.length === 0) {
                console.log('No visits to display');
                tbody.innerHTML = '<tr><td colspan="7" class="text-center">No active visits found</td></tr>';
                return;
            }

            // Clear previous interval if it exists
            if (this.durationUpdateInterval) {
                clearInterval(this.durationUpdateInterval);
            }

            visits.forEach((visit, index) => {
                console.log(`Rendering visit ${index}:`, visit);
                if (!visit.visitor) {
                    console.error(`Visit ${index} has no visitor data:`, visit);
                    return;
                }

                const row = document.createElement('tr');
                const ingressTime = moment(visit.ingressTime).format('YYYY-MM-DD HH:mm');
                const durationId = this.calculateDuration(visit.ingressTime, visit.egressTime);
                
                row.innerHTML = `
                    <td>${ingressTime}</td>
                    <td>${visit.visitor.fullName}</td>
                    <td>${visit.visitor.cellNumber}</td>
                    <td>${visit.visitor.idNumber}</td>
                    <td>
                        ${visit.egressTime ? 
                            durationId : 
                            `<span id="${durationId}" data-ingress="${visit.ingressTime}" class="badge bg-info">
                                Calculating...
                            </span>`
                        }
                    </td>
                    <td>
                        <span class="badge ${visit.egressTime ? 'bg-success' : 'bg-primary'}">
                            ${visit.egressTime ? 'Egressed' : 'Active'}
                        </span>
                    </td>
                    <td class="action-buttons">
                        <button class="btn btn-info btn-sm" onclick="app.viewVisitorCard(${visit.id})">
                            <i class="fas fa-id-card"></i> View
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });

            // Start updating live durations
            this.updateLiveDurations();
            this.durationUpdateInterval = setInterval(() => this.updateLiveDurations(), 1000);

        } catch (error) {
            console.error('Error rendering visitor list:', error);
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error rendering visitor list</td></tr>';
        }
    }

    async viewVisitorCard(visitId) {
        const visit = await this.db.getVisit(visitId);
        const visitor = await this.db.getVisitor(visit.visitorId);
        this.currentVisitor = { visit, visitor };

        const modal = document.getElementById('visitorCardContent');
        modal.innerHTML = `
            <div class="visitor-card">
                <h6>Personal Information</h6>
                <p><strong>Name:</strong> ${visitor.fullName}</p>
                <p><strong>ID Number:</strong> ${visitor.idNumber}</p>
                <p><strong>Cell Number:</strong> ${visitor.cellNumber}</p>
                <p><strong>Purpose:</strong> ${visit.purpose}</p>
                <p><strong>Ingress Time:</strong> ${moment(visit.ingressTime).format('YYYY-MM-DD HH:mm')}</p>
                ${visit.egressTime ? `<p><strong>Egress Time:</strong> ${moment(visit.egressTime).format('YYYY-MM-DD HH:mm')}</p>` : ''}
            </div>
            <div class="visitor-card">
                <h6>Items</h6>
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Identifier</th>
                            <th>Type</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${visit.items.map(item => `
                            <tr>
                                <td>${item.name}</td>
                                <td>${item.identifier}</td>
                                <td>${item.type}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        const visitorModal = new bootstrap.Modal(document.getElementById('visitorCardModal'));
        visitorModal.show();
    }

    async markVisitorEgress() {
        if (!this.currentVisitor) return;

        try {
            await this.db.updateVisit(this.currentVisitor.visit.id, {
                egressTime: new Date()
            });
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('visitorCardModal'));
            modal.hide();
            
            this.loadVisitorList();
            this.showAlert('Visitor marked as egressed', 'success');
        } catch (error) {
            console.error('Error marking visitor egress:', error);
            this.showAlert('Error marking visitor egress', 'danger');
        }
    }

    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.querySelector('.container').insertAdjacentElement('afterbegin', alertDiv);
        setTimeout(() => alertDiv.remove(), 3000);
    }
}

// Initialize the application
const app = new VisitorManagementApp();
