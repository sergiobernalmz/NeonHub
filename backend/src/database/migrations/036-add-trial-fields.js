'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE "stores"
        ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS trial_plan    VARCHAR(20) DEFAULT 'installation';
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE "stores"
        DROP COLUMN IF EXISTS trial_ends_at,
        DROP COLUMN IF EXISTS trial_plan;
    `);
  },
};
