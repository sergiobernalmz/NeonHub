const { sequelize } = require('../config/database');
const { initializeModels } = require('../models');

const connectDatabase = async () => {
  try {
    // probamos la conexión
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida correctamente.');
    
    // inicializamos todos los modelos
    initializeModels();
    console.log('✅ Modelos inicializados correctamente.');
    
    // sincronizamos la base de datos (crea tablas si no existen)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Base de datos sincronizada correctamente.');
    } else {
      await sequelize.sync();
      console.log('✅ Base de datos sincronizada correctamente.');
    }
    
    return sequelize;
  } catch (error) {
    console.error('❌ No se pudo conectar a la base de datos:', error);
    throw error;
  }
};

const closeDatabase = async () => {
  try {
    await sequelize.close();
    console.log('✅ Conexión a la base de datos cerrada correctamente.');
  } catch (error) {
    console.error('❌ Error al cerrar la conexión con la base de datos:', error);
    throw error;
  }
};

const checkDatabaseHealth = async () => {
  try {
    await sequelize.authenticate();
    return {
      status: 'healthy',
      message: 'La conexión a la base de datos funciona correctamente',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

module.exports = {
  connectDatabase,
  closeDatabase,
  checkDatabaseHealth,
  sequelize
};