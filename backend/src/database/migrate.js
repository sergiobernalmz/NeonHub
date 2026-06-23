const fs = require('fs');
const path = require('path');
const { sequelize } = require('./connection');

async function runMigrations() {
  try {
    console.log('🔄 Iniciando migraciones...');
    
    // Crear tabla de migraciones si no existe
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS SequelizeMeta (
        name VARCHAR(255) NOT NULL PRIMARY KEY
      )
    `);
    
    // Obtener migraciones ya ejecutadas
    const [executedMigrations] = await sequelize.query(
      'SELECT name FROM SequelizeMeta ORDER BY name'
    );
    const executedNames = executedMigrations.map(m => m.name);
    
    // Leer archivos de migración
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort();
    
    console.log(`📁 Encontradas ${migrationFiles.length} migraciones`);
    
    for (const file of migrationFiles) {
      if (executedNames.includes(file)) {
        console.log(`⏭️  Saltando ${file} (ya ejecutada)`);
        continue;
      }
      
      console.log(`🔄 Ejecutando migración: ${file}`);
      
      const migration = require(path.join(migrationsDir, file));
      await migration.up(sequelize.getQueryInterface(), sequelize.constructor);
      
      // Marcar como ejecutada
      await sequelize.query(
        'INSERT INTO SequelizeMeta (name) VALUES (?)',
        { replacements: [file] }
      );
      
      console.log(`✅ Migración ${file} completada`);
    }
    
    console.log('🎉 Todas las migraciones completadas exitosamente');
    
  } catch (error) {
    console.error('❌ Error ejecutando migraciones:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };