'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('support_tickets', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false
      },
      customer_email: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      subject: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: true,
        validate: {
          isIn: [['open', 'in_progress', 'resolved']]
        }
      },
      priority: {
        type: Sequelize.STRING(20),
        allowNull: true,
        validate: {
          isIn: [['low', 'normal', 'high', 'urgent']]
        }
      },
      responses: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: []
      },
      read_by_customer: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: true
      },
      read_by_admin: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      },
      customer_last_seen: {
        type: Sequelize.DATE,
        allowNull: true
      },
      admin_last_seen: {
        type: Sequelize.DATE,
        allowNull: true
      },
      store_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      ticket_type: {
        type: Sequelize.ENUM('store_support', 'platform_support', 'billing', 'other'),
        allowNull: false,
        defaultValue: 'store_support'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('now()')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('now()')
      }
    });

    await queryInterface.addIndex('support_tickets', ['store_id'], { name: 'support_tickets_store_id_idx' });
    await queryInterface.addIndex('support_tickets', ['status'], { name: 'support_tickets_status_idx' });
    await queryInterface.addIndex('support_tickets', ['customer_email'], { name: 'support_tickets_customer_email_idx' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('support_tickets');
  }
};
