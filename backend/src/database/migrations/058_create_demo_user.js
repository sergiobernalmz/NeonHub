'use strict';

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DEMO_STORE_ID = '75cf2d3d-f22e-4ac1-805f-5da02e9c70b0';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Crear usuario demo si no existe (idempotente por email/username)
    const [existing] = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE email = 'demo@neonhub.es' OR username = 'demo' LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    let demoUserId;
    if (existing) {
      demoUserId = existing.id;
      console.log(`[Demo user] ya existe (id=${demoUserId}), omitiendo INSERT`);
    } else {
      demoUserId = uuidv4();
      const passwordHash = await bcrypt.hash('Demo1234!', 10);
      await queryInterface.sequelize.query(
        `INSERT INTO users (
           id, username, email, password_hash, first_name, last_name,
           is_active, email_verified, email_verified_at,
           preferences, created_at, updated_at
         ) VALUES (
           :id, 'demo', 'demo@neonhub.es', :hash, 'Demo', 'User',
           true, true, NOW(),
           :prefs::json, NOW(), NOW()
         )`,
        {
          replacements: {
            id: demoUserId,
            hash: passwordHash,
            prefs: JSON.stringify({
              theme: 'dark',
              language: 'es',
              isDemo: true,
              notifications: { email: false, push: false, sms: false }
            })
          }
        }
      );
      console.log(`[Demo user] creado (id=${demoUserId}, password=Demo1234!)`);
    }

    // 2. Asignar rol ceo en la tienda demo (si existe el rol)
    const [roleRow] = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE name = 'ceo' LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (roleRow) {
      await queryInterface.sequelize.query(
        `INSERT INTO user_roles (id, user_id, role_id, store_id, is_active, assigned_at, created_at, updated_at)
         VALUES (:id, :uid, :rid, :sid, true, NOW(), NOW(), NOW())
         ON CONFLICT (user_id, role_id, store_id) DO UPDATE SET is_active = true, updated_at = NOW()`,
        {
          replacements: {
            id: uuidv4(),
            uid: demoUserId,
            rid: roleRow.id,
            sid: DEMO_STORE_ID
          }
        }
      );
      console.log(`[Demo user] rol ceo asignado en store ${DEMO_STORE_ID}`);
    } else {
      console.log('[Demo user] rol ceo no existe — saltando asignación de rol');
    }

    // 3. Vincular usuario con tienda demo en user_stores
    await queryInterface.sequelize.query(
      `INSERT INTO user_stores (user_id, store_id, is_primary)
       VALUES (:uid, :sid, true)
       ON CONFLICT (user_id, store_id) DO UPDATE SET is_primary = true, updated_at = NOW()`,
      { replacements: { uid: demoUserId, sid: DEMO_STORE_ID } }
    );
    console.log(`[Demo user] vinculado a store ${DEMO_STORE_ID}`);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(
      `DELETE FROM user_stores WHERE store_id = :sid AND user_id = (SELECT id FROM users WHERE email = 'demo@neonhub.es')`,
      { replacements: { sid: DEMO_STORE_ID } }
    );
    await queryInterface.sequelize.query(
      `DELETE FROM user_roles WHERE store_id = :sid AND user_id = (SELECT id FROM users WHERE email = 'demo@neonhub.es')`,
      { replacements: { sid: DEMO_STORE_ID } }
    );
    await queryInterface.sequelize.query(
      `DELETE FROM users WHERE email = 'demo@neonhub.es'`
    );
  }
};
