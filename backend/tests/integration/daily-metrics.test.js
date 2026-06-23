/**
 * Tests: GET /api/dashboard/metrics/daily
 *
 * El controlador usa PostgreSQL puro (TO_CHAR) así que mockeamos sequelize.query
 * en los tests que tocan la BD. Los tests de validación van directamente al
 * controlador con supertest y devuelven 400 antes de hacer ninguna consulta.
 */

const request = require('supertest');
const app = require('../../src/app');
const { Store, Role, UserRole } = require('../../src/models');

const BASE_DOMAIN = process.env.TENANT_BASE_DOMAIN || 'neonhub.es';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeStore = (subdomain) =>
  Store.create({
    name: `Store ${subdomain}`,
    subdomain,
    is_active: true,
    api_key_public: `pk_${subdomain}_test`,
    api_key_secret: `sk_${subdomain}_test`
  });

const makeAdminUser = async (store, roleLevel = 80) => {
  const user = await global.testUtils.createTestUser({ store_id: store.id });
  // los nombres de rol solo pueden tener letras y guiones bajos, sin números
  const roleName = roleLevel >= 100 ? 'super_admin' : 'store_admin';
  const [role] = await Role.findOrCreate({
    where: { name: roleName },
    defaults: { name: roleName, display_name: 'Admin', level: roleLevel, description: 'Test admin' }
  });
  await UserRole.create({ user_id: user.id, role_id: role.id, is_active: true });
  return { user, token: global.testUtils.generateTestToken(user) };
};

// ─── TEST 1: default range = 30 days ──────────────────────────────────────────

describe('GET /api/dashboard/metrics/daily', () => {
  let storeA, tokenA, querySpy;

  beforeEach(async () => {
    // creamos los datos de prueba ANTES de instalar el spy para que Store.create/INSERT no quede interceptado
    storeA = await makeStore('metricsstore');
    ({ token: tokenA } = await makeAdminUser(storeA, 80));

    // el spy se instala DESPUÉS de las escrituras en BD — solo intercepta las
    // queries de métricas con TO_CHAR; el resto (autenticación, etc.) pasan normal.
    const db = require('../../src/config/database');
    const realQuery = db.sequelize.query.bind(db.sequelize);
    querySpy = jest.spyOn(db.sequelize, 'query').mockImplementation(async (sql, opts) => {
      if (/TO_CHAR\(created_at/i.test(sql)) return [];
      return realQuery(sql, opts);
    });
  });

  afterEach(() => {
    querySpy?.mockRestore();
  });

  test('TEST 1: sin parámetros devuelve exactamente 30 días', async () => {
    const res = await request(app)
      .get('/api/dashboard/metrics/daily')
      .set('Host', `metricsstore.${BASE_DOMAIN}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const { metrics, period, totals } = res.body.data;

    // exactamente 30 entradas
    expect(metrics).toHaveLength(30);
    expect(period.days).toBe(30);

    // ninguna entrada debe tener undefined/null
    for (const day of metrics) {
      expect(day.date).toBeDefined();
      expect(day.revenue).not.toBeNull();
      expect(day.new_orders).not.toBeNull();
      expect(day.new_users).not.toBeNull();
      expect(day.new_products).not.toBeNull();
    }

    // los días sin datos deben ser ceros (la BD mockeada devuelve arrays vacíos)
    const allZero = metrics.every(
      d => d.revenue === 0 && d.new_orders === 0 && d.new_users === 0 && d.new_products === 0
    );
    expect(allZero).toBe(true);

    // los totales deben coincidir con la suma de todos los días
    const sumRevenue = metrics.reduce((s, d) => s + d.revenue, 0);
    expect(totals.revenue).toBe(parseFloat(sumRevenue.toFixed(2)));
    expect(totals.new_orders).toBe(metrics.reduce((s, d) => s + d.new_orders, 0));
  });

  // ─── TEST 2: multi-tenant — store A no ve datos de store B ────────────────

  test('TEST 2: multi-tenant — el spy captura store_id de la tienda correcta', async () => {
    // reiniciamos el spy a modo captura ANTES de crear los datos de storeB
    querySpy.mockRestore();
    const storeB = await makeStore('otherstore');
    await makeAdminUser(storeB, 80);

    // reinstalamos el spy en modo captura — las queries que no sean de métricas pasan igualmente
    const db = require('../../src/config/database');
    const realQuery2 = db.sequelize.query.bind(db.sequelize);
    const capturedQueries = [];
    querySpy = jest.spyOn(db.sequelize, 'query').mockImplementation(async (sql, opts) => {
      if (/TO_CHAR\(created_at/i.test(sql)) {
        capturedQueries.push({ sql, replacements: opts?.replacements });
        return [];
      }
      return realQuery2(sql, opts);
    });

    // hacemos la petición como store A
    await request(app)
      .get('/api/dashboard/metrics/daily')
      .set('Host', `metricsstore.${BASE_DOMAIN}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    const replacementsA = capturedQueries.map(q => q.replacements);

    // cada query de store A debe llevar storeA.id como parámetro storeId
    for (const r of replacementsA) {
      if (r && r.storeId !== undefined) {
        expect(r.storeId).toBe(storeA.id);
        expect(r.storeId).not.toBe(storeB.id);
      }
    }
  });

  // ─── TEST 3: validación de parámetros ─────────────────────────────────────

  test('TEST 3a: startDate > endDate devuelve 400', async () => {
    const res = await request(app)
      .get('/api/dashboard/metrics/daily?startDate=2025-04-17&endDate=2025-03-01')
      .set('Host', `metricsstore.${BASE_DOMAIN}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  test('TEST 3b: rango > 365 días devuelve 400', async () => {
    const res = await request(app)
      .get('/api/dashboard/metrics/daily?startDate=2023-01-01&endDate=2025-01-01')
      .set('Host', `metricsstore.${BASE_DOMAIN}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  test('TEST 3c: fecha con formato inválido devuelve 400', async () => {
    const res = await request(app)
      .get('/api/dashboard/metrics/daily?startDate=not-a-date')
      .set('Host', `metricsstore.${BASE_DOMAIN}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  test('TEST 3d: sin token devuelve 401', async () => {
    await request(app)
      .get('/api/dashboard/metrics/daily')
      .set('Host', `metricsstore.${BASE_DOMAIN}`)
      .expect(401);
  });
});
