'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addConstraint('users', {
      fields: ['verification_token'],
      type: 'unique',
      name: 'users_verification_token_unique'
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint('users', 'users_verification_token_unique');
  }
};
