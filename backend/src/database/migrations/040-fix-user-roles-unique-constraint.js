'use strict';

module.exports = {
  async up(queryInterface) {
    // eliminamos la restricción antigua que solo cubre (user_id, role_id)
    // también las dos duplicadas autogeneradas con las mismas columnas
    const constraintsToDrop = [
      'unique_user_role',
      'user_roles_user_id_role_id',
      'user_roles_user_id_role_id_key'
    ];

    for (const name of constraintsToDrop) {
      await queryInterface.removeConstraint('user_roles', name).catch(() => {});
    }

    // Add correct multi-tenant constraint: one role per user per store
    await queryInterface.addConstraint('user_roles', {
      fields: ['user_id', 'role_id', 'store_id'],
      type: 'unique',
      name: 'unique_user_role_store'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('user_roles', 'unique_user_role_store').catch(() => {});

    await queryInterface.addConstraint('user_roles', {
      fields: ['user_id', 'role_id'],
      type: 'unique',
      name: 'unique_user_role'
    });
  }
};
