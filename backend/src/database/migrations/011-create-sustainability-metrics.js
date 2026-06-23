'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('sustainability_metrics', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      metric_type: {
        type: Sequelize.ENUM(
          'carbon_footprint',
          'energy_consumption',
          'water_usage',
          'waste_generated',
          'recycling_rate',
          'renewable_energy_percentage',
          'packaging_sustainability',
          'transportation_emissions',
          'supplier_sustainability_score'
        ),
        allowNull: false
      },
      value: {
        type: Sequelize.DECIMAL(15, 4),
        allowNull: false
      },
      unit: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      period_start: {
        type: Sequelize.DATE,
        allowNull: false
      },
      period_end: {
        type: Sequelize.DATE,
        allowNull: false
      },
      recorded_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      source: {
        type: Sequelize.STRING(100),
        allowNull: true
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
      }
    });

    // añadimos índices
    await queryInterface.addIndex('sustainability_metrics', ['metric_type']);
    await queryInterface.addIndex('sustainability_metrics', ['period_start']);
    await queryInterface.addIndex('sustainability_metrics', ['period_end']);
    await queryInterface.addIndex('sustainability_metrics', ['recorded_by']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('sustainability_metrics');
  }
};