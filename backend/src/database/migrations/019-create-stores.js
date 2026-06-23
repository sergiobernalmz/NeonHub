'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('stores', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      subdomain: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      api_key_public: {
        type: Sequelize.STRING(100),
        allowNull: true,
        unique: true
      },
      api_key_secret: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      settings: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: { currency: 'EUR', language: 'es', theme: 'light' }
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: true
      },
      plan_id: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: null
      },
      plan_price_cents: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      billing_start_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      next_payment_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      payment_status: {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: null
      },
      stripe_customer_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
        defaultValue: null
      },
      stripe_subscription_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
        defaultValue: null
      },
      paused_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      paused_reason: {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: null
      },
      fulfillment_mode: {
        type: Sequelize.ENUM('pickup', 'shipping', 'both'),
        allowNull: false,
        defaultValue: 'both'
      },
      pickup_schedule: {
        type: Sequelize.JSON,
        allowNull: true
      },
      shipping_cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      trial_ends_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      trial_plan: {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: 'installation'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    await queryInterface.addIndex('stores', ['subdomain'], { name: 'stores_subdomain_idx', unique: true });
    await queryInterface.addIndex('stores', ['api_key_public'], { name: 'stores_api_key_public_idx', unique: true });
    await queryInterface.addIndex('stores', ['is_active'], { name: 'stores_is_active_idx' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('stores');
  }
};
