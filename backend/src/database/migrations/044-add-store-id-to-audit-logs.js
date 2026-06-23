'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('audit_logs', 'store_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'stores',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addIndex('audit_logs', ['store_id'], {
      name: 'audit_logs_store_id_idx'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('audit_logs', 'audit_logs_store_id_idx');
    await queryInterface.removeColumn('audit_logs', 'store_id');
  }
};
