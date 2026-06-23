const { Sequelize } = require('sequelize');

// mockeamos el middleware de seguridad antes de los imports
jest.mock('../src/middleware/security', () => require('./__mocks__/security'));

// mockeamos el módulo UUID
jest.mock('uuid', () => {
  let counter = 0;
  return {
    v4: () => `mock-uuid-v4-${++counter}`
  };
});

// creamos la base de datos SQLite para los tests
const mockSequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:', // base de datos en memoria para los tests
  logging: false, // desactivamos el log de SQL en tests
  define: {
    timestamps: true,
    underscored: true,
    paranoid: true,
    freezeTableName: true
  }
});

// sobreescribimos la config para usar nuestro sequelize de test
jest.mock('../src/config/database', () => ({
  sequelize: mockSequelize,
  config: {},
  Sequelize: require('sequelize').Sequelize
}));

let models = {};

// preparamos el entorno global de tests
beforeAll(async () => {
  // establecemos las variables de entorno para test
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing-only';

  try {
    // probamos la conexión a la base de datos de test
    await mockSequelize.authenticate();
    console.log('✅ Test database connected (SQLite in-memory)');

    // inicializamos los modelos con la base de datos de test
    const { initializeModels } = require('../src/models');
    models = initializeModels();

    // sincronizamos la base de datos para los tests
    await mockSequelize.sync({ force: true });
    console.log('✅ Test database synced');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
});

// limpiamos al terminar todos los tests
afterAll(async () => {
  try {
    await mockSequelize.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
  }
});

// limpiamos la base de datos antes de cada test
beforeEach(async () => {
  await mockSequelize.sync({ force: true });
});

// utilidades globales para los tests
global.testUtils = {
  // devuelve la instancia de sequelize de test
  getSequelize: () => mockSequelize,

  // devuelve los modelos
  getModels: () => models,

  createTestStore: async (storeData = {}) => {
    const { Store } = models;
    const randomId = Math.random().toString(36).slice(2, 9);

    const defaultStore = {
      name: `Test Store ${randomId}`,
      subdomain: `test${randomId}`,
      is_active: true,
      settings: { currency: 'EUR', language: 'es' }
    };

    return Store.create({ ...defaultStore, ...storeData });
  },
  
  // crea un usuario de prueba
  createTestUser: async (userData = {}) => {
    const { User } = models;
    const bcrypt = require('bcryptjs');

    const store = userData.store_id === null || userData.store_id
      ? null
      : await global.testUtils.createTestStore();
    
    const defaultUser = {
      username: `testuser${Math.random().toString(36).substr(2, 7)}`,
      email: `test${Math.random().toString(36).substr(2, 9)}@example.com`,
      password_hash: await bcrypt.hash('password123', 10),
      first_name: 'Test',
      last_name: 'User',
      is_active: true,
      email_verified: true,
      ...(store ? { store_id: store.id } : {})
    };
    
    return User.create({ ...defaultUser, ...userData });
  },
  
  // crea un producto de prueba
  createTestProduct: async (productData = {}) => {
    const { Product } = models;
    const store = productData.store_id ? null : await global.testUtils.createTestStore();
    const randomId = Math.random().toString(36).substr(2, 9);
    
    const defaultProduct = {
      name: `Test Product ${randomId}`,
      slug: `test-product-${randomId}`,
      sku: `TEST-${randomId.toUpperCase()}`,
      description: 'Test product description',
      price: 99.99,
      cost_price: 50.00,
      stock_quantity: 100,
      is_active: true,
      carbon_footprint: 2.5,
      ...(store ? { store_id: store.id } : {})
    };
    
    return Product.create({ ...defaultProduct, ...productData });
  },
  
  // genera un token JWT para los tests
  generateTestToken: (user) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { id: user.id, username: user.username, email: user.email, store_id: user.store_id || user.storeId || null },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  }
};

// silenciamos console.log durante los tests salvo que esté en modo verbose
if (!process.env.VERBOSE_TESTS) {
  const originalConsoleLog = console.log;
  const originalConsoleInfo = console.info;
  console.log = jest.fn();
  console.info = jest.fn();

  // dejamos pasar los mensajes importantes del test
  console.log = (message, ...args) => {
    if (typeof message === 'string' && (message.includes('✅') || message.includes('❌'))) {
      originalConsoleLog(message, ...args);
    }
  };
}
