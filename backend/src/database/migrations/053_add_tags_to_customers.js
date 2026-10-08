'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDesc = await queryInterface.describeTable('customers');
    if (tableDesc.tags) {
      console.log('customers.tags already exists, skipping');
      return;
    }
    await queryInterface.addColumn('customers', 'tags', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: []
    });
    console.log('customers.tags added');
  },

  down: async (queryInterface) => {
    try {
      await queryInterface.removeColumn('customers', 'tags');
    } catch (_) {}
  }
};
