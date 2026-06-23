'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
    `);
    try {
      await queryInterface.sequelize.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS users_email_store_unique
          ON users (email, COALESCE(store_id, '00000000-0000-0000-0000-000000000000'::uuid));
      `);
    } catch (e) {
      // store_id aún no existe en users en este punto, se aplicará más adelante
      console.log('033: índice users_email_store_unique omitido, store_id no existe aún.');
    }
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS users_email_store_unique;
    `);
    await queryInterface.addConstraint('users', {
      fields: ['email'],
      type: 'unique',
      name: 'users_email_key'
    });
  }
};
