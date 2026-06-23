'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {

    // ===========================================
    // discount_codes
    // ===========================================
    await queryInterface.createTable('discount_codes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      store_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'stores', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('percentage', 'fixed'),
        allowNull: false,
        defaultValue: 'percentage'
      },
      value: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      description: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      min_order_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
      },
      max_uses: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      used_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: true
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('discount_codes', ['store_id', 'code'], {
      name: 'discount_codes_store_id_code_idx',
      unique: true
    });
    await queryInterface.addIndex('discount_codes', ['is_active'], { name: 'discount_codes_is_active_idx' });

    // ===========================================
    // certifications
    // ===========================================
    await queryInterface.createTable('certifications', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      code: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('environmental', 'social', 'quality', 'safety', 'other'),
        allowNull: false,
        defaultValue: 'environmental'
      },
      issuer: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      website: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      country: {
        type: Sequelize.STRING(3),
        allowNull: true
      },
      region: {
        type: Sequelize.ENUM('GLOBAL', 'EU', 'US', 'LATAM', 'APAC', 'OTHER'),
        allowNull: false,
        defaultValue: 'GLOBAL'
      },
      verification_method: {
        type: Sequelize.ENUM('self_declared', 'third_party', 'government', 'ngo'),
        allowNull: false,
        defaultValue: 'third_party'
      },
      api_endpoint: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      api_key: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      validity_period: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 365
      },
      renewal_required: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      level: {
        type: Sequelize.ENUM('basic', 'standard', 'premium', 'gold', 'platinum'),
        allowNull: true
      },
      criteria: {
        type: Sequelize.JSON,
        allowNull: true
      },
      logo: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      color: {
        type: Sequelize.STRING(7),
        allowNull: true,
        defaultValue: '#22c55e'
      },
      impact: {
        type: Sequelize.JSON,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      last_api_check: {
        type: Sequelize.DATE,
        allowNull: true
      },
      api_status: {
        type: Sequelize.ENUM('pending', 'ok', 'error', 'disabled'),
        allowNull: true,
        defaultValue: 'pending'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
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

    await queryInterface.addIndex('certifications', ['code'], { name: 'certifications_code_idx' });
    await queryInterface.addIndex('certifications', ['is_active'], { name: 'certifications_is_active_idx' });

    // ===========================================
    // stripe_events
    // ===========================================
    await queryInterface.createTable('stripe_events', {
      id: {
        type: Sequelize.STRING(255),
        primaryKey: true,
        allowNull: false
      },
      type: {
        type: Sequelize.STRING(120),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('received', 'processing', 'processed', 'failed', 'ignored'),
        allowNull: false,
        defaultValue: 'received'
      },
      payload: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      error: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      received_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      processed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('stripe_events', ['type'], { name: 'stripe_events_type_idx' });
    await queryInterface.addIndex('stripe_events', ['status'], { name: 'stripe_events_status_idx' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('stripe_events');
    await queryInterface.dropTable('certifications');
    await queryInterface.dropTable('discount_codes');
  }
};
