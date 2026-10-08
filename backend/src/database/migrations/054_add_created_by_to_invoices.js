'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDesc = await queryInterface.describeTable('invoices');
    if (tableDesc.created_by) {
      console.log('invoices.created_by already exists, skipping');
      return;
    }
    await queryInterface.addColumn('invoices', 'created_by', {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    });
    console.log('invoices.created_by added');
  },

  down: async (queryInterface) => {
    try {
      await queryInterface.removeColumn('invoices', 'created_by');
    } catch (_) {}
  }
};
