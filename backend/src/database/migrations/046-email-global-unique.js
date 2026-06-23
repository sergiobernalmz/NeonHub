'use strict';

// MODELO B: una persona = una sola fila de usuario = un email único global.
// Revierte la lógica per-store de la migración 033 y restaura email único global.

module.exports = {
  up: async (queryInterface) => {
    const seq = queryInterface.sequelize;

    // 1. Eliminar el índice per-store si existiera (legado de la migración 033)
    await seq.query(`DROP INDEX IF EXISTS users_email_store_unique;`);

    // 2. De-duplicar usuarios con el mismo email (datos de prueba).
    //    Conservamos la fila más antigua (created_at más bajo) por email y
    //    movemos sus vínculos a esa fila antes de borrar los duplicados.
    const [dups] = await seq.query(`
      SELECT lower(email) AS email, COUNT(*) AS n
      FROM users
      WHERE deleted_at IS NULL
      GROUP BY lower(email)
      HAVING COUNT(*) > 1
    `);

    for (const row of dups) {
      const [rows] = await seq.query(`
        SELECT id FROM users
        WHERE lower(email) = :email AND deleted_at IS NULL
        ORDER BY created_at ASC
      `, { replacements: { email: row.email } });

      const keepId = rows[0].id;
      const dropIds = rows.slice(1).map(r => r.id);
      if (dropIds.length === 0) continue;

      // re-apuntar vínculos de las filas duplicadas a la fila que conservamos
      const reassign = [
        ['user_stores', 'user_id'],
        ['user_roles', 'user_id'],
        ['user_permissions', 'user_id'],
      ];
      for (const [table, col] of reassign) {
        await seq.query(
          `UPDATE ${table} SET ${col} = :keepId WHERE ${col} IN (:dropIds)`,
          { replacements: { keepId, dropIds } }
        ).catch(() => {});
      }

      // limpiar posibles duplicados exactos creados al re-apuntar
      await seq.query(`
        DELETE FROM user_stores a USING user_stores b
        WHERE a.ctid < b.ctid AND a.user_id = b.user_id AND a.store_id = b.store_id
      `).catch(() => {});
      await seq.query(`
        DELETE FROM user_roles a USING user_roles b
        WHERE a.ctid < b.ctid AND a.user_id = b.user_id AND a.role_id = b.role_id
          AND COALESCE(a.store_id::text,'') = COALESCE(b.store_id::text,'')
      `).catch(() => {});

      // borrar las filas de usuario duplicadas
      await seq.query(`DELETE FROM users WHERE id IN (:dropIds)`, {
        replacements: { dropIds }
      });
    }

    // 3. Normalizar emails a minúsculas para evitar duplicados por mayúsculas
    await seq.query(`UPDATE users SET email = lower(email)`);

    // 4. Añadir restricción única global sobre email
    await seq.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_email_global_unique ON users (email);
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS users_email_global_unique;`);
  }
};
