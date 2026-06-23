'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('activation_tokens', {
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
        onDelete: 'CASCADE'
      },
      store_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'stores', key: 'id' },
        onDelete: 'CASCADE'
      },
      token: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        allowNull: false,
        unique: true
      },
      type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      used: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    await queryInterface.addIndex('activation_tokens', ['token'], {
      name: 'idx_activation_tokens_token'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('activation_tokens');
  }
};
