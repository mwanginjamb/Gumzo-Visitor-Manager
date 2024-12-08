const Visitor = require('../models/visitor');
const Visit = require('../models/visit');
const sequelize = require('../config/database');

exports.syncData = async (req, res) => {
    const { visitors, visits } = req.body;
    const transaction = await sequelize.transaction();

    try {
        // Process visitors
        for (const visitor of visitors) {
            await Visitor.upsert(visitor, { transaction });
        }

        // Process visits
        for (const visit of visits) {
            await Visit.upsert(visit, { transaction });
        }

        await transaction.commit();

        res.status(200).json({
            success: true,
            message: 'Data synchronized successfully',
            timestamp: new Date()
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Sync error:', error);
        res.status(500).json({
            success: false,
            message: 'Error synchronizing data',
            error: error.message
        });
    }
};
