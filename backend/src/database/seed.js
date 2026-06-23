const fs = require('fs');
const path = require('path');
const { sequelize } = require('./connection');

async function runSeeders() {
  try {
    console.log('🌱 Iniciando seeders...');
    
    // Crear tabla de seeders si no existe
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS SequelizeData (
        name VARCHAR(255) NOT NULL PRIMARY KEY
      )
    `);
    
    // Obtener seeders ya ejecutados
    const [executedSeeders] = await sequelize.query(
      'SELECT name FROM SequelizeData ORDER BY name'
    );
    const executedNames = executedSeeders.map(s => s.name);
    
    // Leer archivos de seeder
    const seedersDir = path.join(__dirname, 'seeders');
    const seederFiles = fs.readdirSync(seedersDir)
      .filter(file => file.endsWith('.js'))
      .sort();
    
    console.log(`📁 Encontrados ${seederFiles.length} seeders`);
    
    for (const file of seederFiles) {
      if (executedNames.includes(file)) {
        console.log(`⏭️  Saltando ${file} (ya ejecutado)`);
        continue;
      }
      
      console.log(`🌱 Ejecutando seeder: ${file}`);
      
      const seeder = require(path.join(seedersDir, file));
      await seeder.up(sequelize.getQueryInterface(), sequelize.constructor);
      
      // Marcar como ejecutado
      await sequelize.query(
        'INSERT INTO SequelizeData (name) VALUES (?)',
        { replacements: [file] }
      );
      
      console.log(`✅ Seeder ${file} completado`);
    }
    
    console.log('🎉 Todos los seeders completados exitosamente');
    
  } catch (error) {
    console.error('❌ Error ejecutando seeders:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  runSeeders();
}

module.exports = { runSeeders };