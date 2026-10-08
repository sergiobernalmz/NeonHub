'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDesc = await queryInterface.describeTable('categories');

    if (!tableDesc.color) {
      await queryInterface.addColumn('categories', 'color', {
        type: Sequelize.STRING(7),
        allowNull: true,
        defaultValue: '#6366f1'
      });
      console.log('categories.color added');
    } else {
      console.log('categories.color already exists, skipping');
    }

    if (!tableDesc.icon) {
      await queryInterface.addColumn('categories', 'icon', {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: null
      });
      console.log('categories.icon added');
    } else {
      console.log('categories.icon already exists, skipping');
    }
  },

  down: async (queryInterface) => {
    try {
      await queryInterface.removeColumn('categories', 'icon');
    } catch (_) {}
    try {
      await queryInterface.removeColumn('categories', 'color');
    } catch (_) {}
  }
};
