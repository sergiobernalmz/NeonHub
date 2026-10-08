'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_customers_customer_type" ADD VALUE IF NOT EXISTS 'business';`
    );
    console.log("Added 'business' to enum_customers_customer_type");
  },

  down: async (queryInterface) => {
    // Postgres no permite quitar valores de un ENUM creado in-place.
    // No-op intencionado.
  }
};
