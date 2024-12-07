class VisitorDB {
    constructor() {
        this.dbName = 'visitorManagementDB';
        this.dbVersion = 1;
        this.db = null;
        this.dbReady = this.init();
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                reject('Error opening database');
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create visitors store
                if (!db.objectStoreNames.contains('visitors')) {
                    const visitorStore = db.createObjectStore('visitors', { keyPath: 'idNumber' });
                    visitorStore.createIndex('fullName', 'fullName', { unique: false });
                    visitorStore.createIndex('cellNumber', 'cellNumber', { unique: false });
                }

                // Create visits store
                if (!db.objectStoreNames.contains('visits')) {
                    const visitStore = db.createObjectStore('visits', { keyPath: 'id', autoIncrement: true });
                    visitStore.createIndex('visitorId', 'visitorId', { unique: false });
                    visitStore.createIndex('ingressTime', 'ingressTime', { unique: false });
                }
            };
        });
    }

    async ensureDB() {
        if (!this.db) {
            await this.dbReady;
        }
    }

    async addVisitor(visitorData) {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['visitors'], 'readwrite');
            const store = transaction.objectStore('visitors');
            const request = store.put(visitorData);

            request.onsuccess = () => resolve(visitorData);
            request.onerror = () => reject('Error adding visitor');
        });
    }

    async getVisitor(idNumber) {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['visitors'], 'readonly');
            const store = transaction.objectStore('visitors');
            const request = store.get(idNumber);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject('Error getting visitor');
        });
    }

    async searchVisitors(query) {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['visitors'], 'readonly');
            const store = transaction.objectStore('visitors');
            const request = store.openCursor();
            const results = [];

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const visitor = cursor.value;
                    if (visitor.fullName.toLowerCase().includes(query.toLowerCase()) ||
                        visitor.idNumber.includes(query)) {
                        results.push(visitor);
                    }
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };

            request.onerror = () => reject('Error searching visitors');
        });
    }

    async addVisit(visitData) {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['visits'], 'readwrite');
            const store = transaction.objectStore('visits');
            const request = store.add(visitData);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject('Error adding visit');
        });
    }

    async updateVisit(visitId, updates) {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['visits'], 'readwrite');
            const store = transaction.objectStore('visits');
            const request = store.get(visitId);

            request.onsuccess = () => {
                const visit = request.result;
                const updatedVisit = { ...visit, ...updates };
                const updateRequest = store.put(updatedVisit);
                
                updateRequest.onsuccess = () => resolve(updatedVisit);
                updateRequest.onerror = () => reject('Error updating visit');
            };

            request.onerror = () => reject('Error getting visit for update');
        });
    }

    async updateVisitItems(visitId, items) {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['visits'], 'readwrite');
            const store = transaction.objectStore('visits');
            const request = store.get(visitId);

            request.onsuccess = () => {
                const visit = request.result;
                if (!visit) {
                    reject('Visit not found');
                    return;
                }

                visit.items = items;
                const updateRequest = store.put(visit);
                
                updateRequest.onsuccess = () => resolve(visit);
                updateRequest.onerror = () => reject('Error updating visit items');
            };

            request.onerror = () => reject('Error getting visit for update');
        });
    }

    async getActiveVisits() {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['visits'], 'readonly');
            const store = transaction.objectStore('visits');
            const request = store.getAll(); 

            request.onsuccess = (event) => {
                const visits = event.target.result || [];
                console.log('Retrieved visits from DB:', visits);
                resolve(visits.filter(visit => !visit.egressTime));
            };

            request.onerror = (error) => {
                console.error('Error getting active visits:', error);
                reject('Error getting active visits');
            };
        });
    }

    async getAllVisits() {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['visits'], 'readonly');
            const store = transaction.objectStore('visits');
            const request = store.getAll();

            request.onsuccess = (event) => {
                const visits = event.target.result || [];
                console.log('Retrieved all visits from DB:', visits);
                resolve(visits);
            };

            request.onerror = (error) => {
                console.error('Error getting visits:', error);
                reject('Error getting visits');
            };
        });
    }

    async getVisitHistory(visitorId) {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['visits'], 'readonly');
            const store = transaction.objectStore('visits');
            const index = store.index('visitorId');
            const request = index.getAll(visitorId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject('Error getting visit history');
        });
    }

    async getVisit(visitId) {
        await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['visits'], 'readonly');
            const store = transaction.objectStore('visits');
            const request = store.get(visitId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject('Error getting visit');
        });
    }
}
