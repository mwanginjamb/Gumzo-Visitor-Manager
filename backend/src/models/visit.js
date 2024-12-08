const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const Visitor = require('./visitor');

const Visit = sequelize.define('Visit', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    visitorId: {
        type: DataTypes.STRING(50),
        allowNull: false,
        references: {
            model: Visitor,
            key: 'idNumber'
        }
    },
    purpose: {
        type: DataTypes.STRING(200),
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
    timestamps: true,
    indexes: [
        {
            name: 'idx_visits_visitorid',
            fields: ['visitorId']
        },
        {
            name: 'idx_visits_ingresstime',
            fields: ['ingressTime']
        },
        {
            name: 'idx_visits_egresstime',
            fields: ['egressTime']
        },
        {
            name: 'idx_visits_lastsync',
            fields: ['lastSync']
        },
        {
            name: 'idx_visits_visitor_ingress',
            fields: ['visitorId', 'ingressTime']
        }
    ]
});

Visit.belongsTo(Visitor, { foreignKey: 'visitorId' });
Visitor.hasMany(Visit, { foreignKey: 'visitorId' });

module.exports = Visit;
