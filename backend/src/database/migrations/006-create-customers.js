'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('customers', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      customer_code: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true
      },
      customer_type: {
        type: Sequelize.ENUM('individual', 'company'),
        allowNull: false,
        defaultValue: 'individual'
      },
      company_name: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      tax_id: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      first_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      last_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      mobile: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      billing_address: {
        type: Sequelize.JSON,
        allowNull: true
      },
      shipping_address: {
        type: Sequelize.JSON,
        allowNull: true
      },
      credit_limit: {
        type: Sequelize.DECIMAL(12, 2),
        defaultValue: 0.00
      },
      current_balance: {
        type: Sequelize.DECIMAL(12, 2),
        defaultValue: 0.00
      },
      payment_terms: {
        type: Sequelize.INTEGER,
        defaultValue: 30
      },
      discount_rate: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0.00
      },
      currency: {
        type: Sequelize.STRING(3),
        defaultValue: 'EUR'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
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
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // añadimos índices
    await queryInterface.addIndex('customers', ['customer_code']);
    await queryInterface.addIndex('customers', ['email']);
    await queryInterface.addIndex('customers', ['customer_type']);
    await queryInterface.addIndex('customers', ['is_active']);
    await queryInterface.addIndex('customers', ['company_name']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('customers');
  }
};