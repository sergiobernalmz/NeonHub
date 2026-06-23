/**
 * Tests de integración: aislamiento por tenant en Reports
 *
 * Cubre las 3 vulnerabilidades corregidas en el Bloque 2 (reportes):
 *   VULN-1  getReports    — 403 cuando storeId es null y el usuario no es superadmin
 *   VULN-2  findReportInTenant / getReportById — 403/404 en acceso cross-tenant
 *   VULN-3  getReportStats — el filtro de tenant se mantiene al fusionar el scope de permisos
 */

const request = require('supertest');
const app = require('../../src/app');
const { Report, Store, Role, UserRole } = require('../../src/models');

const BASE_DOMAIN = process.env.TENANT_BASE_DOMAIN || 'neonhub.es';

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _reportCounter = 0;
const makeReport = (reporterId, overrides = {}) =>
  Report.create({
    report_number: `RPT-TEST-${++_reportCounter}`,
    type: 'bug',
    title: `Report by ${reporterId}`,
    description: 'Integration test report',
    priority: 'medium',
    status: 'pending',
    reporter_id: reporterId,
    ...overrides
  });

const makeStore = (subdomain) =>
  Store.create({
    name: `Store ${subdomain}`,
    subdomain,
    is_active: true,
    api_key_public: `pk_${subdomain}_test`,
    api_key_secret: `sk_${subdomain}_test`
  });

/** crea un usuario con el store_id dado. Pasar null para crear usuario sin tienda. */
const makeUser = (storeId) => {
  const args = storeId !== null ? { store_id: storeId } : { store_id: null };
  return global.testUtils.createTestUser(args);
};

/** asigna el rol superadmin al usuario y devuelve un token firmado. */
const makeSuperadmin = async (user) => {
  const [role] = await Role.findOrCreate({
    where: { name: 'superadmin' },
    defaults: { name: 'superadmin', display_name: 'Super Admin', level: 100, description: 'Platform superadmin' }
  });
  await UserRole.create({ user_id: user.id, role_id: role.id, is_active: true });
  return global.testUtils.generateTestToken(user);
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Report tenant isolation', () => {
  let storeA, storeB;
  let userA, userB;
  let tokenA, tokenB;

  beforeEach(async () => {
    _reportCounter = 0;

    storeA = await makeStore('reporttiendaa');
    storeB = await makeStore('reporttiendab');

    userA = await makeUser(storeA.id);
    userB = await makeUser(storeB.id);

    tokenA = global.testUtils.generateTestToken(userA);
    tokenB = global.testUtils.generateTestToken(userB);
  });

  // ── VULN-1: getReports — 403 when no tenant context (non-superadmin) ────────

  test('VULN-1: non-superadmin with null storeId gets 403', async () => {
    // el usuario no tiene store_id → resolveStoreId devuelve null via localhost (sin cabecera de tenant)
    const orphanUser = await makeUser(null);
    const orphanToken = global.testUtils.generateTestToken(orphanUser);

    const res = await request(app)
      .get('/api/reports')
      .set('Host', 'localhost')          // tenantContext devuelve null con este host
      .set('Authorization', `Bearer ${orphanToken}`)
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Tenant context required');
  });

  // ── VULN-1: getReports — scoped to tenant, store B reports are hidden ───────

  test('VULN-1: user of store A does not see reports from store B', async () => {
    await makeReport(userA.id, { title: 'Visible — store A' });
    await makeReport(userB.id, { title: 'Hidden — store B' });

    const res = await request(app)
      .get('/api/reports')
      .set('Host', `reporttiendaa.${BASE_DOMAIN}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const titles = res.body.data.reports.map(r => r.title);
    expect(titles.some(t => t.includes('store A'))).toBe(true);
    expect(titles.some(t => t.includes('store B'))).toBe(false);
  });

  // ── VULN-2: getReportById — 404 for cross-tenant access ────────────────────

  test('VULN-2: getReportById returns 404 for report belonging to store B', async () => {
    const reportB = await makeReport(userB.id, { title: 'Confidential B' });

    // userA accede con el subdominio de storeA → storeId = storeA.id
    // reportB.reporter_id = userB.id que no pertenece a storeA
    const res = await request(app)
      .get(`/api/reports/${reportB.id}`)
      .set('Host', `reporttiendaa.${BASE_DOMAIN}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);

    expect(res.body.success).toBe(false);
  });

  test('VULN-2: getReportById returns 403 with null storeId (non-superadmin)', async () => {
    const orphanUser = await makeUser(null);
    const orphanToken = global.testUtils.generateTestToken(orphanUser);
    const reportA = await makeReport(userA.id);

    const res = await request(app)
      .get(`/api/reports/${reportA.id}`)
      .set('Host', 'localhost')
      .set('Authorization', `Bearer ${orphanToken}`)
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Tenant context required');
  });

  test('VULN-2: getReportById returns own store report correctly', async () => {
    const reportA = await makeReport(userA.id, { title: 'Own store report' });

    const res = await request(app)
      .get(`/api/reports/${reportA.id}`)
      .set('Host', `reporttiendaa.${BASE_DOMAIN}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(reportA.id);
  });

  // ── VULN-3: getReportStats — tenant filter preserved for non-admin ──────────

  test('VULN-3: getReportStats total reflects only current tenant reports', async () => {
    // 2 reportes para storeA, 1 para storeB
    await makeReport(userA.id);
    await makeReport(userA.id);
    await makeReport(userB.id);

    const res = await request(app)
      .get('/api/reports/stats')
      .set('Host', `reporttiendaa.${BASE_DOMAIN}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    // userA no es admin → ruta no-admin; con VULN-3 corregida el filtro de tenant se mantiene
    // solo deben contarse los reportes de/asignados a userA (que están todos en storeA)
    expect(res.body.data.total).toBe(2);
  });

  test('VULN-3: getReportStats does not leak store B data into store A stats', async () => {
    // 1 reporte en storeA (de userA), 5 reportes en storeB (de userB)
    await makeReport(userA.id);
    for (let i = 0; i < 5; i++) {
      await makeReport(userB.id);
    }

    const resA = await request(app)
      .get('/api/reports/stats')
      .set('Host', `reporttiendaa.${BASE_DOMAIN}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    // sin el fix el total sería 6 (todos los reportes). Con el fix debe ser 1.
    expect(resA.body.data.total).toBeLessThanOrEqual(1);
  });

  // ── Superadmin: access without tenant context is allowed ───────────────────

  test('Superadmin with null storeId is NOT blocked by tenant guard on GET /reports', async () => {
    // el SA no tiene store_id → resolveStoreId null, pero isSuperAdminUser → true → el guard se salta.
    // el scope de permisos no-admin limita los resultados a los reportes propios del SA,
    // así que creamos uno de saUser para confirmar un 200 real con datos.
    const saUser = await makeUser(null);
    const saToken = await makeSuperadmin(saUser);

    // reporte creado por el propio SA — canBeViewedBy pasa (reporter_id === user.id)
    // y el scope no-admin de getReports también pasa (reporter_id: saUser.id coincide)
    await makeReport(saUser.id, { title: 'SA own report' });

    const res = await request(app)
      .get('/api/reports')
      .set('Host', 'localhost')
      .set('Authorization', `Bearer ${saToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    // el guard no bloqueó — el SA recibió 200 y puede ver su propio reporte
    expect(res.body.data.reports.length).toBeGreaterThanOrEqual(1);
  });

  test('Superadmin with null storeId is NOT blocked by tenant guard on getReportById', async () => {
    const saUser = await makeUser(null);
    const saToken = await makeSuperadmin(saUser);

    // reporte creado por el SA → canBeViewedBy devuelve true (reporter_id === user.id)
    const saReport = await makeReport(saUser.id, { title: 'SA authored report' });

    const res = await request(app)
      .get(`/api/reports/${saReport.id}`)
      .set('Host', 'localhost')
      .set('Authorization', `Bearer ${saToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(saReport.id);
  });
});
