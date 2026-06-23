'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sso_tokens', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true
      },
      token: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE'
      },
      store_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'stores', key: 'id' },
        onDelete: 'CASCADE'
      },
      used: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      expires_at: {
        type: Sequelize.DATE,
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

    await queryInterface.addIndex('sso_tokens', ['token'], { name: 'sso_tokens_token_idx' });
    await queryInterface.addIndex('sso_tokens', ['expires_at'], { name: 'sso_tokens_expires_at_idx' });
    await queryInterface.addIndex('sso_tokens', ['user_id'], { name: 'sso_tokens_user_id_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sso_tokens');
  }
};
