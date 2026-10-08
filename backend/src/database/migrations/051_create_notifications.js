'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    let tableDesc = {};
    try {
      tableDesc = await queryInterface.describeTable('notifications');
    } catch (_) {}
    if (tableDesc.id) {
      console.log('notifications table already exists, skipping');
      return;
    }
    await queryInterface.createTable('notifications', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('info', 'success', 'warning', 'error', 'report_assigned', 'new_report', 'report_comment'),
        allowNull: false,
        defaultValue: 'info'
      },
      category: {
        type: Sequelize.ENUM('system', 'order', 'invoice', 'product', 'user', 'sustainability'),
        allowNull: false,
        defaultValue: 'system'
      },
      is_read: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      read_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      action_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {}
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
    await queryInterface.addIndex('notifications', ['user_id']);
    await queryInterface.addIndex('notifications', ['is_read']);
    await queryInterface.addIndex('notifications', ['category']);
    console.log('notifications table created');
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('notifications');
  }
};
