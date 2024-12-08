const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Visitor = sequelize.define('Visitor', {
    idNumber: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false
    },
    fullName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    cellNumber: {
        type: DataTypes.STRING,
        allowNull: false
    },
    lastSync: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'visitors',
    timestamps: true
});

module.exports = Visitor;
