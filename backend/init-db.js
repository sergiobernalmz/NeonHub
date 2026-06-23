const { sequelize } = require('./src/database/connection');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function initializeDatabase() {
  try {
    console.log('🔄 Inicializando base de datos...');

    // Forzar sincronización de la base de datos
    await sequelize.sync({ force: true });
    console.log('✅ Tablas creadas exitosamente');

    // Crear tienda por defecto
    const storeId = uuidv4();
    await sequelize.query(`
      INSERT INTO stores (
        id, name, subdomain, settings, is_active, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, {
      replacements: [
        storeId, 'NeonHub Main Store', 'main',
        JSON.stringify({ currency: 'EUR', language: 'es' }),
        true, new Date(), new Date()
      ]
    });
    console.log('✅ Tienda principal creada exitosamente');

    // Crear usuario administrador
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash('admin123', 12);

    await sequelize.query(`
      INSERT INTO users (
        id, store_id, username, email, password_hash, 
        first_name, last_name, is_active, email_verified, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, {
      replacements: [
        userId, storeId, 'admin', 'admin@ecocommerce.com', hashedPassword,
        'Sistema', 'Administrador', true, true,
        new Date(), new Date()
      ]
    });

    console.log('✅ Usuario administrador creado exitosamente');
    console.log('📧 Email: admin@ecocommerce.com');
    console.log('🔑 Password: admin123');
    console.log('🎉 Base de datos inicializada correctamente');

  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

initializeDatabase();