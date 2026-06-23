'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('user_stores')) {
      console.log('user_stores already exists — skipping');
      return;
    }

    await queryInterface.createTable('user_stores', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      store_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'stores', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      is_primary: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    await queryInterface.addConstraint('user_stores', {
      fields: ['user_id', 'store_id'],
      type: 'unique',
      name: 'user_stores_user_id_store_id_unique'
    });

    await queryInterface.addIndex('user_stores', ['user_id'], { name: 'user_stores_user_id_idx' });
    await queryInterface.addIndex('user_stores', ['store_id'], { name: 'user_stores_store_id_idx' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('user_stores');
  }
};
