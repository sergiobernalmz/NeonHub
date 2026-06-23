'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('users', 'verification_token_expires', {
            type: Sequelize.DATE,
            allowNull: true,
            defaultValue: null,
            after: 'verification_token'
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('users', 'verification_token_expires');
    }
};