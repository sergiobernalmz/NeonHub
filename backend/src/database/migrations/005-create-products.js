'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('products', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      slug: {
        type: Sequelize.STRING(200),
        allowNull: false,
        unique: true
      },
      sku: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      short_description: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      category_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'categories',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      cost_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      compare_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      currency: {
        type: Sequelize.STRING(3),
        defaultValue: 'EUR'
      },
      stock_quantity: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      min_stock_level: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      max_stock_level: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      track_inventory: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      allow_backorder: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      weight: {
        type: Sequelize.DECIMAL(8, 3),
        allowNull: true
      },
      dimensions: {
        type: Sequelize.JSON,
        allowNull: true
      },
      images: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      tags: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      is_featured: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      carbon_footprint: {
        type: Sequelize.DECIMAL(8, 3),
        allowNull: true
      },
      sustainability_score: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      eco_friendly: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      recyclable: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
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
    await queryInterface.addIndex('products', ['sku']);
    await queryInterface.addIndex('products', ['slug']);
    await queryInterface.addIndex('products', ['category_id']);
    await queryInterface.addIndex('products', ['is_active']);
    await queryInterface.addIndex('products', ['is_featured']);
    await queryInterface.addIndex('products', ['price']);
    await queryInterface.addIndex('products', ['stock_quantity']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('products');
  }
};