'use strict';

module.exports = {
  up: async (queryInterface) => {
    // Migración de datos: solo aplica si users ya tiene store_id (entorno producción)
    try {
      await queryInterface.sequelize.query(`
        INSERT INTO user_stores (user_id, store_id, is_primary, created_at, updated_at)
        SELECT id, store_id, true, NOW(), NOW()
        FROM users
        WHERE store_id IS NOT NULL
        ON CONFLICT (user_id, store_id) DO NOTHING
      `);

      await queryInterface.sequelize.query(`
        UPDATE user_roles ur
        SET store_id = u.store_id
        FROM users u
        WHERE ur.user_id = u.id
          AND u.store_id IS NOT NULL
          AND ur.store_id IS NULL
      `);
    } catch (e) {
      // En entorno local/vacío no hay datos que migrar, se omite
      console.log('026-populate-user-stores: sin datos que migrar, omitido.');
    }
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`DELETE FROM user_stores`);
    await queryInterface.sequelize.query(`UPDATE user_roles SET store_id = NULL`);
  }
};
