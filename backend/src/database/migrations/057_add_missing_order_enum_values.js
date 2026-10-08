'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_orders_status" ADD VALUE IF NOT EXISTS 'completed';`
    );
    console.log("Added 'completed' to enum_orders_status");

    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_orders_payment_status" ADD VALUE IF NOT EXISTS 'pending_payment';`
    );
    console.log("Added 'pending_payment' to enum_orders_payment_status");

    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_orders_payment_status" ADD VALUE IF NOT EXISTS 'processing';`
    );
    console.log("Added 'processing' to enum_orders_payment_status");

    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_orders_payment_status" ADD VALUE IF NOT EXISTS 'succeeded';`
    );
    console.log("Added 'succeeded' to enum_orders_payment_status");

    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_orders_payment_status" ADD VALUE IF NOT EXISTS 'failed';`
    );
    console.log("Added 'failed' to enum_orders_payment_status");
  },

  down: async (queryInterface) => {
    // Postgres no permite quitar valores de un ENUM creado in-place.
    // No-op intencionado.
  }
};
