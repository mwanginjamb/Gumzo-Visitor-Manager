const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Visitor = sequelize.define('Visitor', {
    idNumber: {
        type: DataTypes.STRING(50),
        primaryKey: true,
        allowNull: false
    },
    fullName: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    cellNumber: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    lastSync: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'visitors',
    timestamps: true,
    indexes: [
        {
            name: 'idx_visitors_fullname',
            fields: ['fullName']
        },
        {
            name: 'idx_visitors_cellnumber',
            fields: ['cellNumber']
        },
        {
            name: 'idx_visitors_lastsync',
            fields: ['lastSync']
        }
    ]
});

module.exports = Visitor;
