'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔧 Agregando roles para sistema de reportes...');

    const rolesToAdd = [
      {
        id: uuidv4(),
        name: 'developer',
        display_name: 'Desarrollador',
        description: 'Equipo de desarrollo y TI - Recibe reportes técnicos, bugs y solicitudes de mejoras',
        permissions: JSON.stringify({
          reports: { view_technical: true, resolve: true, comment: true },
          products: { view: true, edit: true },
          orders: { view: true },
          users: { view: true }
        }),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'support',
        display_name: 'Soporte al Cliente',
        description: 'Equipo de atención al cliente - Recibe quejas, problemas de productos y devoluciones',
        permissions: JSON.stringify({
          reports: { view_customer: true, resolve: true, comment: true },
          orders: { view: true, edit: true, cancel: true },
          products: { view: true },
          customers: { view: true, edit: true }
        }),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'ceo',
        display_name: 'CEO/Dirección',
        description: 'Dirección ejecutiva - Recibe reportes estratégicos, financieros y análisis',
        permissions: JSON.stringify({
          reports: { view_all: true, resolve: true, comment: true },
          dashboard: { view_all: true },
          analytics: { view: true, export: true },
          users: { view: true, edit: true },
          all: { view: true }
        }),
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    // comprobamos si los roles ya existen para no duplicarlos
    try {
      const existingRoles = await queryInterface.sequelize.query(
        "SELECT name FROM roles WHERE name IN ('developer', 'support', 'ceo')",
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      const existingNames = existingRoles.map(r => r.name);

      const newRoles = rolesToAdd.filter(r => !existingNames.includes(r.name));

      if (newRoles.length > 0) {
        await queryInterface.bulkInsert('roles', newRoles);
        console.log(`✅ ${newRoles.length} roles agregados.`);
      } else {
        console.log('ℹ️  Todos los roles ya existen.');
      }
    } catch (e) {
      console.error("Error inserting roles:", e);
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('roles', {
      name: {
        [Sequelize.Op.in]: ['developer', 'support', 'ceo']
      }
    });
  }
};
