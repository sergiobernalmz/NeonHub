'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // comprobamos si la columna ya existe
    const tableDescription = await queryInterface.describeTable('users');
    
    if (!tableDescription.address) {
      await queryInterface.addColumn('users', 'address', {
        type: Sequelize.TEXT,
        allowNull: true,
        after: 'phone'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('users');
    
    if (tableDescription.address) {
      await queryInterface.removeColumn('users', 'address');
    }
  }
};
