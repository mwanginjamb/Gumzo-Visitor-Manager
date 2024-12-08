const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Visitor = require('./visitor');

const Visit = sequelize.define('Visit', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    visitorId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: Visitor,
            key: 'idNumber'
        }
    },
    purpose: {
        type: DataTypes.STRING,
        allowNull: false
    },
    ingressTime: {
        type: DataTypes.DATE,
        allowNull: false
    },
    egressTime: {
        type: DataTypes.DATE,
        allowNull: true
    },
    items: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: []
    },
    lastSync: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'visits',
    timestamps: true
});

Visit.belongsTo(Visitor, { foreignKey: 'visitorId' });
Visitor.hasMany(Visit, { foreignKey: 'visitorId' });

module.exports = Visit;
