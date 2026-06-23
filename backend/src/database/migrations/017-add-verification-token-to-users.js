'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Add verification_token column to users table
        await queryInterface.addColumn('users', 'verification_token', {
            type: Sequelize.STRING(255),
            allowNull: true,
            after: 'password_reset_expires'
        });
    },

    down: async (queryInterface, Sequelize) => {
        // eliminamos la columna verification_token de la tabla users
        await queryInterface.removeColumn('users', 'verification_token');
    }
};
