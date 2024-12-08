# Visitor Management Sync Service

This is the backend synchronization service for the Visitor Management System. It provides an API endpoint to sync visitor and visit data from the frontend's IndexedDB to a MariaDB database.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
Copy `.env.example` to `.env` and update the values:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=visitor_management
PORT=3000
```

3. Start the server:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

## API Endpoints

### POST /api/sync
Synchronizes visitor and visit data from the frontend.

Request body:
```json
{
  "visitors": [
    {
      "idNumber": "string",
      "fullName": "string",
      "cellNumber": "string"
    }
  ],
  "visits": [
    {
      "visitorId": "string",
      "purpose": "string",
      "ingressTime": "datetime",
      "egressTime": "datetime",
      "items": []
    }
  ]
}
```

Response:
```json
{
  "success": true,
  "message": "Data synchronized successfully",
  "timestamp": "datetime"
}
```

## Database Schema

### Visitors Table
- idNumber (PK)
- fullName
- cellNumber
- lastSync
- createdAt
- updatedAt

### Visits Table
- id (PK)
- visitorId (FK)
- purpose
- ingressTime
- egressTime
- items (JSON)
- lastSync
- createdAt
- updatedAt
