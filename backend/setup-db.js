const { sequelize } = require('./src/config/database');
const { initializeModels } = require('./src/models');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function setupDatabase() {
  try {
    console.log('Inicializando base de datos...');
    
    // Inicializar modelos
    const models = initializeModels();
    
    // Sincronizar base de datos (crear tablas)
    await sequelize.sync({ force: true });
    console.log('Tablas creadas exitosamente');
    
    // Crear rol de administrador
    const adminRole = await models.Role.create({
      id: uuidv4(),
      name: 'super_admin',
      display_name: 'Super Administrador',
      description: 'Acceso completo al sistema',
      permissions: {
        users: { create: true, read: true, update: true, delete: true },
        products: { create: true, read: true, update: true, delete: true },
        orders: { create: true, read: true, update: true, delete: true },
        invoices: { create: true, read: true, update: true, delete: true },
        customers: { create: true, read: true, update: true, delete: true },
        dashboard: { view: true, analytics: true, reports: true },
        sustainability: { view: true, manage: true, reports: true },
        system: { settings: true, backup: true, logs: true }
      },
      level: 1,
      is_system: true
    });
    
    console.log('Rol de administrador creado');
    
    // Crear usuario administrador
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const adminUser = await models.User.create({
      id: uuidv4(),
      username: 'admin',
      email: 'admin@ecocommerce.com',
      password: hashedPassword,
      first_name: 'Admin',
      last_name: 'User',
      role_id: adminRole.id,
      is_active: true,
      email_verified: true
    });
    
    console.log('Usuario administrador creado:');
    console.log('Email: admin@ecocommerce.com');
    console.log('Password: admin123');
    
    await sequelize.close();
    console.log('Base de datos configurada exitosamente');
    
  } catch (error) {
    console.error('Error configurando la base de datos:', error);
    process.exit(1);
  }
}

setupDatabase();