'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {

    // ===========================================
    // provisioning_jobs
    // ===========================================
    await queryInterface.createTable('provisioning_jobs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      stripe_event_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        references: { model: 'stripe_events', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      store_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'stores', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      status: {
        type: Sequelize.ENUM('queued', 'processing', 'done', 'failed', 'skipped'),
        allowNull: false,
        defaultValue: 'queued'
      },
      retries: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      payload: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      last_error: {
        type: Sequelize.TEXT,
        allowNull: true
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

    await queryInterface.addIndex('provisioning_jobs', ['status'], { name: 'provisioning_jobs_status_idx' });
    await queryInterface.addIndex('provisioning_jobs', ['store_id'], { name: 'provisioning_jobs_store_id_idx' });
    await queryInterface.addIndex('provisioning_jobs', ['stripe_event_id'], { name: 'provisioning_jobs_stripe_event_id_idx' });

    // ===========================================
    // payment_records
    // ===========================================
    await queryInterface.createTable('payment_records', {
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
      amount_cents: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      concept: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      payment_method: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'manual'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      payment_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      recorded_by: {
        type: Sequelize.STRING(100),
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

    await queryInterface.addIndex('payment_records', ['store_id'], { name: 'payment_records_store_id_idx' });
    await queryInterface.addIndex('payment_records', ['payment_date'], { name: 'payment_records_payment_date_idx' });

    // ===========================================
    // product_certifications
    // ===========================================
    await queryInterface.createTable('product_certifications', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      product_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      certification_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'certifications', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      certification_number: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      issue_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      expiry_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('active', 'expired', 'revoked', 'pending'),
        allowNull: false,
        defaultValue: 'active'
      },
      verification_status: {
        type: Sequelize.ENUM('pending', 'verified', 'failed', 'expired'),
        allowNull: false,
        defaultValue: 'pending'
      },
      score: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true
      },
      level: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      certifying_body: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      certificate_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      verification_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      documents: {
        type: Sequelize.JSON,
        allowNull: true
      },
      cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      renewal_cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      last_verification: {
        type: Sequelize.DATE,
        allowNull: true
      },
      next_verification: {
        type: Sequelize.DATE,
        allowNull: true
      },
      verification_data: {
        type: Sequelize.JSON,
        allowNull: true
      },
      alerts_sent: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {}
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_public: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      priority: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      audit_trail: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
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

    await queryInterface.addIndex('product_certifications', ['product_id', 'certification_id'], {
      name: 'product_certifications_product_certification_idx',
      unique: true
    });
    await queryInterface.addIndex('product_certifications', ['product_id'], { name: 'product_certifications_product_id_idx' });
    await queryInterface.addIndex('product_certifications', ['certification_id'], { name: 'product_certifications_certification_id_idx' });
    await queryInterface.addIndex('product_certifications', ['status'], { name: 'product_certifications_status_idx' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('product_certifications');
    await queryInterface.dropTable('payment_records');
    await queryInterface.dropTable('provisioning_jobs');
  }
};
