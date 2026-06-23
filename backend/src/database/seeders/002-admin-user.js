'use strict';

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const ceoUserId = uuidv4();
    const adminUserId = uuidv4();
    const programmerUserId = uuidv4();
    const ceoPassword = await bcrypt.hash('ceo123', 12);
    const adminPassword = await bcrypt.hash('admin123', 12);
    const programmerPassword = await bcrypt.hash('programmer123', 12);

    // datos de los usuarios CEO y Admin
    const usersData = [
      {
        id: ceoUserId,
        username: 'ceo',
        email: 'ceo@ecocommerce.com',
        password_hash: ceoPassword,
        first_name: 'Director',
        last_name: 'General',
        is_active: true,
        email_verified: true,
        email_verified_at: new Date(),
        preferences: JSON.stringify({
          theme: 'dark',
          language: 'es',
          notifications: {
            email: true,
            push: true,
            sms: false
          },
          dashboard: {
            layout: 'grid',
            widgets: ['sales', 'orders', 'sustainability', 'notifications', 'users']
          }
        }),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: adminUserId,
        username: 'admin',
        email: 'admin@ecocommerce.com',
        password_hash: adminPassword,
        first_name: 'Admin',
        last_name: 'Principal',
        is_active: true,
        email_verified: true,
        email_verified_at: new Date(),
        preferences: JSON.stringify({
          theme: 'light',
          language: 'es',
          notifications: {
            email: true,
            push: false,
            sms: false
          },
          dashboard: {
            layout: 'list',
            widgets: ['sales', 'orders', 'notifications']
          }
        }),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: programmerUserId,
        username: 'programmer',
        email: 'programmer@ecocommerce.com',
        password_hash: programmerPassword,
        first_name: 'Super',
        last_name: 'Programador',
        is_active: true,
        email_verified: true,
        email_verified_at: new Date(),
        preferences: JSON.stringify({
          theme: 'dark',
          language: 'es',
          notifications: {
            email: true,
            push: true,
            sms: false
          },
          dashboard: {
            layout: 'grid',
            widgets: ['sales', 'orders', 'sustainability', 'notifications', 'users']
          }
        }),
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    // insertamos los usuarios uno a uno si no existen ya
    for (const user of usersData) {
      const [existingUser] = await queryInterface.sequelize.query(
        `SELECT id FROM users WHERE username = '${user.username}' LIMIT 1`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      if (!existingUser) {
        await queryInterface.bulkInsert('users', [user]);
      }
    }

    // obtenemos los roles
    const [ceoRole] = await queryInterface.sequelize.query(
      "SELECT id FROM roles WHERE name = 'ceo' LIMIT 1",
      { type: Sequelize.QueryTypes.SELECT }
    );

    const [adminRole] = await queryInterface.sequelize.query(
      "SELECT id FROM roles WHERE name = 'admin' LIMIT 1",
      { type: Sequelize.QueryTypes.SELECT }
    );

    const [programmerRole] = await queryInterface.sequelize.query(
      "SELECT id FROM roles WHERE name = 'programmer' LIMIT 1",
      { type: Sequelize.QueryTypes.SELECT }
    );

    // asignamos los roles si aún no están asignados
    const assignRole = async (username, roleId) => {
      const [user] = await queryInterface.sequelize.query(
        `SELECT id FROM users WHERE username = '${username}' LIMIT 1`,
        { type: Sequelize.QueryTypes.SELECT }
      );

      if (user && roleId) {
        const [existingAuth] = await queryInterface.sequelize.query(
          `SELECT id FROM user_roles WHERE user_id = '${user.id}' AND role_id = '${roleId}' LIMIT 1`,
          { type: Sequelize.QueryTypes.SELECT }
        );

        if (!existingAuth) {
          // obtenemos el id real del asignador (CEO)
          const [assigner] = await queryInterface.sequelize.query(
            `SELECT id FROM users WHERE username = 'ceo' LIMIT 1`,
            { type: Sequelize.QueryTypes.SELECT }
          );

          await queryInterface.bulkInsert('user_roles', [{
            id: uuidv4(),
            user_id: user.id,
            role_id: roleId,
            assigned_by: assigner ? assigner.id : user.id,
            assigned_at: new Date(),
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          }]);
        }
      }
    };

    if (ceoRole) await assignRole('ceo', ceoRole.id);
    if (adminRole) await assignRole('admin', adminRole.id);
    if (programmerRole) await assignRole('programmer', programmerRole.id);
  },

  down: async (queryInterface, Sequelize) => {
    // eliminamos los usuarios CEO y Admin y sus asignaciones de rol
    await queryInterface.bulkDelete('user_roles', {
      user_id: {
        [Sequelize.Op.in]: [
          queryInterface.sequelize.literal(
            "(SELECT id FROM users WHERE username IN ('ceo', 'admin', 'programmer'))"
          )
        ]
      }
    });

    await queryInterface.bulkDelete('users', {
      username: {
        [Sequelize.Op.in]: ['ceo', 'admin', 'programmer']
      }
    });
  }
};