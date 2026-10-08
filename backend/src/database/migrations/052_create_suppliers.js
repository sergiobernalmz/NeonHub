'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    let tableDesc = {};
    try {
      tableDesc = await queryInterface.describeTable('suppliers');
    } catch (_) {}
    if (tableDesc.id) {
      console.log('suppliers table already exists, skipping');
      return;
    }
    await queryInterface.createTable('suppliers', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      contact_email: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      certification: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'None'
      },
      sustainability_score: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });
    await queryInterface.addIndex('suppliers', ['is_active']);
    console.log('suppliers table created');
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('suppliers');
  }
};
