require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./config/database');
const { createDirectories } = require('./utils/fileSystem');
const saasProvisioningService = require('./services/saasProvisioningService');
const { initializeSocketIO } = require('./services/socketService');

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

const requireEnv = (name) => {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
};

if (process.env.NODE_ENV === 'production') {
  requireEnv('JWT_SECRET');
  requireEnv('JWT_REFRESH_SECRET');
  requireEnv('DB_HOST');
  requireEnv('DB_NAME');
  requireEnv('DB_USER');
  requireEnv('DB_PASSWORD');
}

const startServer = async () => {
  try {
    console.log('🚀 Iniciando EcoCommerce API...');
    console.log(`📊 Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔧 Versión de Node.js: ${process.version}`);

    console.log('📁 Creando directorios necesarios...');
    await createDirectories();

    console.log('🔌 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida correctamente');

    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Sincronizando modelos de base de datos...');
      await sequelize.sync({ alter: false });
      console.log('✅ Modelos sincronizados correctamente');
    }

    console.log('🌍 Inicializando sistema de sostenibilidad...');
    const { getSustainabilityScheduler } = require('./services/sustainabilityScheduler');
    const scheduler = getSustainabilityScheduler();

    if (process.env.ENABLE_REAL_TIME_SUSTAINABILITY !== 'false') {
      scheduler.start();
      console.log('✅ Sistema de datos reales de sostenibilidad iniciado');
    } else {
      console.log('⚠️ Sistema de sostenibilidad en modo manual (ENABLE_REAL_TIME_SUSTAINABILITY=false)');
    }

    console.log('🏆 Inicializando sistema de certificaciones...');
    const certificationScheduler = require('./services/certificationScheduler');
    const certificationDataService = require('./services/certificationDataService');

    await certificationDataService.initializeBaseCertifications();

    if (process.env.ENABLE_CERTIFICATION_SCHEDULER !== 'false') {
      await certificationScheduler.start();
      console.log('✅ Sistema de certificaciones automático iniciado');
    } else {
      console.log('⚠️ Sistema de certificaciones en modo manual (ENABLE_CERTIFICATION_SCHEDULER=false)');
    }

    const orderCleanupScheduler = require('./services/orderCleanupScheduler');
    orderCleanupScheduler.start();

    const trialScheduler = require('./services/trialScheduler');
    trialScheduler.start();

    const server = app.listen(PORT, HOST, () => {
      console.log('🎉 ¡Servidor iniciado exitosamente!');
      console.log(`🌐 Servidor ejecutándose en: http://${HOST}:${PORT}`);
      console.log(`📚 API Base URL: http://${HOST}:${PORT}/api`);
      console.log(`🏥 Health Check: http://${HOST}:${PORT}/health`);
      console.log(`📖 API Info: http://${HOST}:${PORT}/api/info`);

      if (process.env.NODE_ENV === 'development') {
        console.log('\n🔗 Enlaces útiles:');
        console.log(`   • API Health: http://localhost:${PORT}/health`);
        console.log(`   • API Info: http://localhost:${PORT}/api/info`);
        console.log(`   • Auth Endpoints: http://localhost:${PORT}/api/auth`);
        console.log(`   • Products: http://localhost:${PORT}/api/products`);
        console.log(`   • Orders: http://localhost:${PORT}/api/orders`);
      }

      console.log('\n⚡ ¡El servidor está listo para recibir solicitudes!');
    });

    initializeSocketIO(server);
    console.log('🔌 Socket.IO inicializado para comunicación en tiempo real');

    await saasProvisioningService.startWorker();

    const billingCheckService = require('./services/billingCheckService');
    billingCheckService.startBillingChecker();

    const demoTenantService = require('./services/demoTenantService');
    demoTenantService.startResetScheduler();

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Error: El puerto ${PORT} ya está en uso`);
        console.log('💡 Sugerencias:');
        console.log('   • Cambia el puerto en el archivo .env');
        console.log('   • Detén otros procesos que usen este puerto');
        console.log(`   • Usa: netstat -ano | findstr :${PORT} (Windows)`);
      } else {
        console.error('❌ Error del servidor:', error.message);
      }
      process.exit(1);
    });

    const gracefulShutdown = async (signal) => {
      console.log(`\n🛑 Señal ${signal} recibida, cerrando servidor...`);

      server.close(async () => {
        console.log('🔌 Servidor HTTP cerrado');

        try {
          const scheduler = require('./services/sustainabilityScheduler').getSustainabilityScheduler();
          const certificationScheduler = require('./services/certificationScheduler');

          if (scheduler.isRunning) {
            scheduler.stop();
            console.log('🌍 Sistema de sostenibilidad detenido');
          }

          if (certificationScheduler.isRunning) {
            await certificationScheduler.stop();
            console.log('🏆 Sistema de certificaciones detenido');
          }

          saasProvisioningService.stopWorker();

          await sequelize.close();
          console.log('🗄️ Conexión a la base de datos cerrada');
        } catch (error) {
          console.error('❌ Error al cerrar la conexión a la base de datos:', error.message);
        }

        console.log('👋 Proceso terminado correctamente');
        process.exit(0);
      });

      setTimeout(() => {
        console.error('⚠️ Forzando cierre del proceso...');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error.message);

    if (error.name === 'SequelizeConnectionError') {
      console.error('🔌 Error de conexión a la base de datos:');
      console.error('   • Verifica que MySQL esté ejecutándose');
      console.error('   • Revisa las credenciales en el archivo .env');
      console.error('   • Confirma que la base de datos existe');
    } else if (error.code === 'ENOTFOUND') {
      console.error('🌐 Error de red:');
      console.error('   • Verifica la conexión a internet');
      console.error('   • Revisa la configuración del host de la base de datos');
    } else {
      console.error('📋 Stack trace:', error.stack);
    }

    process.exit(1);
  }
};

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  console.error('🛑 Cerrando servidor debido a unhandled promise rejection');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  console.error('📋 Stack:', error.stack);
  console.error('🛑 Cerrando servidor debido a uncaught exception');
  process.exit(1);
});

startServer();

