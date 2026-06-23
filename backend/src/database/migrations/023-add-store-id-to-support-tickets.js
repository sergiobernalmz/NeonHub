'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const columns = await queryInterface.describeTable('support_tickets');
    if (!columns.store_id) {
      await queryInterface.addColumn('support_tickets', 'store_id', {
        type: Sequelize.UUID,
        allowNull: true,
        defaultValue: null,
        references: {
          model: 'stores',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }

    const indexes = await queryInterface.showIndex('support_tickets');
    const indexExists = indexes.some(i => i.name === 'support_tickets_store_id_idx');
    if (!indexExists) {
      await queryInterface.addIndex('support_tickets', ['store_id'], {
        name: 'support_tickets_store_id_idx'
      });
    }
  },

  down: async (queryInterface, _Sequelize) => {
    await queryInterface.removeIndex('support_tickets', 'support_tickets_store_id_idx');
    await queryInterface.removeColumn('support_tickets', 'store_id');
  }
};
