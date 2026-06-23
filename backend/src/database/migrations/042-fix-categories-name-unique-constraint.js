'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(
      'ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key'
    );
    try {
      await queryInterface.addIndex('categories', ['name', 'store_id'], {
        unique: true,
        name: 'categories_name_store_id'
      });
    } catch (e) {
      console.log('042: índice categories_name_store_id omitido, store_id no existe aún en categories.');
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('categories', 'categories_name_store_id');
    await queryInterface.sequelize.query(
      'ALTER TABLE categories ADD CONSTRAINT categories_name_key UNIQUE (name)'
    );
  }
};
