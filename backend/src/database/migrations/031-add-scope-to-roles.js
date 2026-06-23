'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE roles ADD COLUMN IF NOT EXISTS scope VARCHAR(20) NOT NULL DEFAULT 'store';
      CREATE INDEX IF NOT EXISTS idx_roles_scope ON roles(scope);
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('roles', 'idx_roles_scope');
    await queryInterface.removeColumn('roles', 'scope');
  }
};
