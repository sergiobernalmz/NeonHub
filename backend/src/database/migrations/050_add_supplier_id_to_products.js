'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDesc = await queryInterface.describeTable('products');

    if (!tableDesc.supplier_id) {
      await queryInterface.addColumn('products', 'supplier_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'suppliers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      console.log('products.supplier_id added');
    } else {
      console.log('products.supplier_id already exists, skipping');
    }
  },

  down: async (queryInterface) => {
    try {
      await queryInterface.removeColumn('products', 'supplier_id');
    } catch (_) {}
  }
};
