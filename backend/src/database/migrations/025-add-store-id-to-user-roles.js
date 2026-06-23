'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const columns = await queryInterface.describeTable('user_roles');
    if (columns.store_id) {
      console.log('user_roles.store_id already exists — skipping');
      return;
    }

    await queryInterface.addColumn('user_roles', 'store_id', {
      type: Sequelize.UUID,
      allowNull: true,
      defaultValue: null,
      references: { model: 'stores', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addIndex('user_roles', ['store_id'], { name: 'user_roles_store_id_idx' });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('user_roles', 'user_roles_store_id_idx');
    await queryInterface.removeColumn('user_roles', 'store_id');
  }
};
