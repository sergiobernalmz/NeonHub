'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.addColumn('support_tickets', 'ticket_type', {
        type: Sequelize.ENUM('store_support', 'neonhub_support'),
        allowNull: false,
        defaultValue: 'store_support'
      });
    } catch (e) {
      console.log('043: ticket_type ya existe en support_tickets, omitido.');
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('support_tickets', 'ticket_type');
    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS enum_support_tickets_ticket_type"
    );
  }
};
