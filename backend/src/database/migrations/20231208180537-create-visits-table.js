'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('visits', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      visitorId: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: {
          model: 'visitors',
          key: 'idNumber'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      purpose: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      ingressTime: {
        type: Sequelize.DATE,
        allowNull: false
      },
      egressTime: {
        type: Sequelize.DATE,
        allowNull: true
      },
      items: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: []
      },
      lastSync: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('visits', ['visitorId'], {
      name: 'idx_visits_visitorid'
    });
    
    await queryInterface.addIndex('visits', ['ingressTime'], {
      name: 'idx_visits_ingresstime'
    });
    
    await queryInterface.addIndex('visits', ['egressTime'], {
      name: 'idx_visits_egresstime'
    });
    
    await queryInterface.addIndex('visits', ['lastSync'], {
      name: 'idx_visits_lastsync'
    });

    // Add composite index for visitor's visits by date
    await queryInterface.addIndex('visits', ['visitorId', 'ingressTime'], {
      name: 'idx_visits_visitor_ingress'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('visits');
  }
};
