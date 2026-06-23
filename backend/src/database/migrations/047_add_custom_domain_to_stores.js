'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('stores', 'custom_domain', {
      type: Sequelize.STRING(255),
      allowNull: true,
      unique: true
    });

    await queryInterface.addColumn('stores', 'custom_domain_ssl_verified', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });

    await queryInterface.addColumn('stores', 'custom_domain_verification_token', {
      type: Sequelize.STRING(64),
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('stores', 'custom_domain_verification_token');
    await queryInterface.removeColumn('stores', 'custom_domain_ssl_verified');
    await queryInterface.removeColumn('stores', 'custom_domain');
  }
};