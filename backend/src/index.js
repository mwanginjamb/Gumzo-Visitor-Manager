require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/sequelize');
const syncRoutes = require('./routes/syncRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', syncRoutes);

// Database sync and server start
const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await sequelize.authenticate();
        console.log('Database connection established successfully.');

        // Don't sync in production, use migrations instead
        if (process.env.NODE_ENV !== 'production') {
            await sequelize.sync();
            console.log('Database models synchronized.');
        }

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Unable to start server:', error);
        process.exit(1);
    }
}

startServer();
