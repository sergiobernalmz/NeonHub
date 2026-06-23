const { sequelize } = require('../config/database');

async function dropTables() {
    try {
        console.log('🗑️  Eliminando tablas de reportes para limpieza...');
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
        await sequelize.query('DROP TABLE IF EXISTS report_comments');
        await sequelize.query('DROP TABLE IF EXISTS reports');
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('✅ Tablas eliminadas.');
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await sequelize.close();
    }
}

dropTables();
