const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

async function addVerificationColumn() {
    try {
        console.log('🔄 Checking users table for verification_token...');

        const queryInterface = sequelize.getQueryInterface();
        const tableInfo = await queryInterface.describeTable('users');

        if (tableInfo.verification_token) {
            console.log('✅ verification_token already exists.');
        } else {
            console.log('➕ Adding verification_token column...');
            await queryInterface.addColumn('users', 'verification_token', {
                type: DataTypes.STRING(255),
                allowNull: true,
                after: 'password_reset_expires'
            });
            console.log('✅ Column added successfully.');
        }

        if (tableInfo.email_verified) {
            console.log('✅ email_verified already exists.');
        } else {
            console.log('➕ Adding email_verified column...');
            await queryInterface.addColumn('users', 'email_verified', {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                after: 'is_active'
            });
            console.log('✅ email_verified added.');
        }

    } catch (error) {
        console.error('❌ Error updating database:', error);
    } finally {
        await sequelize.close();
    }
}

addVerificationColumn();
