'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('visitors', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      idNumber: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      fullName: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      cellNumber: {
        type: Sequelize.STRING(20),
        allowNull: false
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
    await queryInterface.addIndex('visitors', ['idNumber'], {
      name: 'idx_visitors_idNumber'
    });

    await queryInterface.addIndex('visitors', ['fullName'], {
      name: 'idx_visitors_fullname'
    });
    
    await queryInterface.addIndex('visitors', ['cellNumber'], {
      name: 'idx_visitors_cellnumber'
    });
    
    await queryInterface.addIndex('visitors', ['lastSync'], {
      name: 'idx_visitors_lastsync'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('visitors');
  }
};
