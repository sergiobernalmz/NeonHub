'use strict';

// Añade columna url_mapping JSON a stores para custom paths por tienda.
// Estructura: {"shop": "/tienda", "dashboard": "/panel", "products": "/catalogo", "orders": "/pedidos"}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('stores', 'url_mapping', {
      type: Sequelize.DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      comment: 'Custom URL paths per store. JSON: {"shop": "/tienda", "dashboard": "/panel"}'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('stores', 'url_mapping');
  }
};