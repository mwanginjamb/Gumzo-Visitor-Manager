class VisitorManagementApp {
    constructor() {
        this.db = new VisitorDB();
        this.currentVisitor = null;
        this.visitsData = []; // Store visits data for filtering
        this.durationUpdateInterval = null;
        this.init();
    }

    init() {
        // Initialize the database
        this.db = new VisitorDB();
        this.db.init().then(() => {
            // Add event listeners
            document.getElementById('searchInput')?.addEventListener('input', () => this.filterVisits());
            document.getElementById('statusFilter')?.addEventListener('change', () => this.filterVisits());
            
            // Show initial page
            this.showPage('visitor-list');
        }).catch(error => {
            console.error('Error initializing app:', error);
            this.showAlert('Error initializing application: ' + error.message, 'danger');
        });
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
        try {
            // Get all pages
            const pages = document.querySelectorAll('.page');
            if (!pages || pages.length === 0) {
                console.error('No pages found with class "page"');
                return;
            }

            // Hide all pages and remove active class
            pages.forEach(page => {
                if (page) {
                    page.style.display = 'none';
                    page.classList.remove('active');
                }
            });

            // Show the selected page
            const selectedPage = document.getElementById(pageId);
            if (!selectedPage) {
                console.error(`Page with id "${pageId}" not found`);
                return;
            }

            selectedPage.style.display = 'block';
            selectedPage.classList.add('active');

            // Update navigation buttons if they exist
            const buttons = document.querySelectorAll('[onclick*="showPage"]');
            buttons.forEach(button => {
                if (button.onclick.toString().includes(pageId)) {
                    button.classList.add('active');
                } else {
                    button.classList.remove('active');
                }
            });

            // Special handling for specific pages
            if (pageId === 'visitor-list') {
                this.loadVisitorList();
            }

            // Scroll to top of page
            window.scrollTo(0, 0);
        } catch (error) {
            console.error('Error showing page:', error);
            this.showAlert('Error navigating to page: ' + error.message, 'danger');
        }
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

    async renderVisitorList(visits) {
        const tbody = document.getElementById('visitorListBody');
        if (!tbody) {
            console.error('Visitor list tbody not found');
            return;
        }

        tbody.innerHTML = '';

        if (!visits || visits.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">No visits found</td></tr>';
            return;
        }

        for (const visit of visits) {
            try {
                const visitor = await this.db.getVisitor(visit.visitorId);
                if (!visitor) {
                    console.error('Visitor not found for visit:', visit);
                    continue;
                }

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${this.escapeHtml(visitor.fullName)}</td>
                    <td>${this.escapeHtml(visitor.idNumber)}</td>
                    <td>${this.escapeHtml(visitor.cellNumber)}</td>
                    <td>${this.escapeHtml(visit.purpose)}</td>
                    <td>${moment(visit.ingressTime).format('YYYY-MM-DD HH:mm')}</td>
                    <td>${visit.egressTime ? moment(visit.egressTime).format('YYYY-MM-DD HH:mm') : '-'}</td>
                    <td>
                        <span class="${visit.egressTime ? '' : 'badge bg-info'}" 
                            ${!visit.egressTime ? `id="live-duration-${visit.id}" data-ingress="${visit.ingressTime}"` : ''}>
                            ${this.calculateDuration(visit.ingressTime, visit.egressTime)}
                        </span>
                    </td>
                    <td class="action-buttons">
                        <button class="btn btn-info btn-sm me-1" onclick="app.viewVisitorCard(${visit.id})">
                            <i class="fas fa-eye"></i> View
                        </button>
                        ${!visit.egressTime ? `
                            <button class="btn btn-warning btn-sm me-1" onclick="app.editVisit(${visit.id})">
                                <i class="fas fa-edit"></i> Update
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="app.markVisitorEgress(${visit.id})">
                                <i class="fas fa-sign-out-alt"></i> Egress
                            </button>
                        ` : ''}
                    </td>
                `;
                tbody.appendChild(row);
            } catch (error) {
                console.error('Error rendering visit:', visit, error);
            }
        }

        // Start updating live durations
        this.updateLiveDurations();
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    async loadVisitorList() {
        try {
            const visits = await this.db.getAllVisits();
            if (!visits) {
                console.error('No visits returned from database');
                return;
            }
            await this.renderVisitorList(visits);
        } catch (error) {
            console.error('Error loading visitor list:', error);
            this.showAlert('Error loading visitor list: ' + error.message, 'danger');
        }
    }

    async filterVisits() {
        try {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const statusFilter = document.getElementById('statusFilter').value;
            
            let visits = await this.db.getAllVisits();
            
            // Filter by status
            if (statusFilter !== 'all') {
                visits = visits.filter(visit => {
                    if (statusFilter === 'active') return !visit.egressTime;
                    if (statusFilter === 'egressed') return visit.egressTime;
                    return true;
                });
            }

            // Filter by search term
            if (searchTerm) {
                const filteredVisits = [];
                for (const visit of visits) {
                    const visitor = await this.db.getVisitor(visit.visitorId);
                    if (visitor.fullName.toLowerCase().includes(searchTerm) ||
                        visitor.idNumber.toLowerCase().includes(searchTerm) ||
                        visitor.cellNumber.toLowerCase().includes(searchTerm) ||
                        visit.purpose.toLowerCase().includes(searchTerm)) {
                        filteredVisits.push(visit);
                    }
                }
                visits = filteredVisits;
            }

            await this.renderVisitorList(visits);
        } catch (error) {
            console.error('Error filtering visits:', error);
            this.showAlert('Error filtering visits: ' + error.message, 'danger');
        }
    }

    async editVisit(visitId) {
        try {
            const visit = await this.db.getVisit(visitId);
            if (!visit) {
                throw new Error('Visit not found');
            }

            const visitor = await this.db.getVisitor(visit.visitorId);
            if (!visitor) {
                throw new Error('Visitor not found');
            }
            
            // Store current visit for update
            this.currentVisitor = { visit, visitor };

            // Show update page first
            this.showPage('update-visit');

            // Get form elements after page is shown
            const form = document.getElementById('updateVisitorForm');
            if (!form) {
                throw new Error('Update form not found');
            }

            // Get form input elements
            const fullNameInput = form.querySelector('[name="fullName"]');
            const idNumberInput = form.querySelector('[name="idNumber"]');
            const cellNumberInput = form.querySelector('[name="cellNumber"]');
            const purposeInput = form.querySelector('[name="purpose"]');

            if (!fullNameInput || !idNumberInput || !cellNumberInput || !purposeInput) {
                throw new Error('Required form fields not found');
            }

            // Populate form fields
            fullNameInput.value = visitor.fullName || '';
            idNumberInput.value = visitor.idNumber || '';
            cellNumberInput.value = visitor.cellNumber || '';
            purposeInput.value = visit.purpose || '';

            // Populate items table
            const itemsBody = document.getElementById('updateItemsBody');
            if (!itemsBody) {
                throw new Error('Items table body not found');
            }

            itemsBody.innerHTML = '';
            if (Array.isArray(visit.items)) {
                visit.items.forEach((item, index) => {
                    const row = this.createUpdateItemRow(item, index);
                    itemsBody.appendChild(row);
                });
            }

            // Setup event listeners
            const addItemButton = document.getElementById('addUpdateItemRow');
            if (addItemButton) {
                addItemButton.onclick = () => {
                    const newRow = this.createUpdateItemRow({ name: '', identifier: '', type: '' }, itemsBody.children.length);
                    itemsBody.appendChild(newRow);
                };
            }

            form.onsubmit = (e) => this.handleUpdateVisit(e);

        } catch (error) {
            console.error('Error preparing visit update:', error);
            this.showAlert('Error loading visit data: ' + error.message, 'danger');
            this.showPage('visitor-list'); // Return to list on error
        }
    }

    createUpdateItemRow(item, index) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <input type="text" class="form-control" name="itemName" 
                    value="${this.escapeHtml(item.name || '')}" required>
            </td>
            <td>
                <input type="text" class="form-control" name="itemIdentifier" 
                    value="${this.escapeHtml(item.identifier || '')}" required>
            </td>
            <td>
                <input type="text" class="form-control" name="itemType" 
                    value="${this.escapeHtml(item.type || '')}" required>
            </td>
            <td>
                <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('tr').remove()">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        return row;
    }

    async handleUpdateVisit(e) {
        e.preventDefault();
        try {
            const form = e.target;
            const itemRows = document.getElementById('updateItemsBody').children;
            
            if (!this.currentVisitor) {
                throw new Error('No visitor data found for update');
            }
            
            // Collect items data
            const items = Array.from(itemRows).map(row => ({
                name: row.querySelector('[name="itemName"]').value.trim(),
                identifier: row.querySelector('[name="itemIdentifier"]').value.trim(),
                type: row.querySelector('[name="itemType"]').value.trim()
            }));

            // Validate required fields
            const fullName = form.querySelector('[name="fullName"]').value.trim();
            const cellNumber = form.querySelector('[name="cellNumber"]').value.trim();
            const purpose = form.querySelector('[name="purpose"]').value.trim();

            if (!fullName || !cellNumber || !purpose) {
                throw new Error('Please fill in all required fields');
            }

            // Prepare visitor and visit data
            const visitorData = {
                ...this.currentVisitor.visitor,
                fullName,
                cellNumber
            };

            const visitData = {
                ...this.currentVisitor.visit,
                purpose,
                items
            };

            // Update in database
            await this.db.updateVisit(this.currentVisitor.visit.id, visitData, visitorData);

            // Show success and return to list
            this.showAlert('Visit updated successfully', 'success');
            await this.loadVisitorList();
            this.showPage('visitor-list');
        } catch (error) {
            console.error('Error updating visit:', error);
            this.showAlert('Error updating visit: ' + error.message, 'danger');
        }
    }

    async viewVisitorCard(visitId) {
        try {
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
                    <p><strong>Duration:</strong> <span class="${visit.egressTime ? '' : 'badge bg-info'}" 
                        ${!visit.egressTime ? `id="live-duration-${visit.id}" data-ingress="${visit.ingressTime}"` : ''}>
                        ${this.calculateDuration(visit.ingressTime, visit.egressTime)}
                    </span></p>
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

            // Update duration if active visit
            if (!visit.egressTime) {
                this.updateLiveDurations();
            }
        } catch (error) {
            console.error('Error viewing visitor card:', error);
            this.showAlert('Error viewing visitor details', 'danger');
        }
    }

    async deleteVisitorItem(visitId, itemIndex) {
        try {
            const visit = await this.db.getVisit(visitId);
            if (!visit || visit.egressTime) {
                throw new Error('Cannot delete item: Visit not found or already egressed');
            }

            // Remove the item at the specified index
            const updatedItems = [...visit.items];
            updatedItems.splice(itemIndex, 1);

            // Update the visit with the new items array
            await this.db.updateVisitItems(visitId, updatedItems);

            // Refresh the visitor card
            await this.viewVisitorCard(visitId);
            this.showAlert('Item deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting visitor item:', error);
            this.showAlert('Error deleting item: ' + error.message, 'danger');
        }
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

    async markVisitorEgress(visitId) {
        try {
            await this.db.updateVisit(visitId, {
                egressTime: new Date()
            });
            
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
