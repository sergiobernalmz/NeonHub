const { sequelize } = require('../config/database');

async function resetMigration() {
    try {
        console.log('🔄 Eliminando registro de migración fallida...');
        await sequelize.query(
            "DELETE FROM SequelizeMeta WHERE name = 'add-report-roles.js'"
        );
        console.log('✅ Registro eliminado. Ahora puedes volver a ejecutar "npm run migrate"');
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await sequelize.close();
    }
}

resetMigration();
