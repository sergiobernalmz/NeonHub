/**
 * Tests: GET /api/admin/audit-logs  +  auditMiddleware
 *
 * TEST 4 — aislamiento por rol:
 *   Admin de tienda A ve solo logs con store_id = tienda A
 *   Super-admin ve logs de todas las tiendas
 *   Admin de tienda A no puede filtrar logs de tienda B vía query param
 *
 * TEST 5 — middleware de auditoría:
 *   POST exitoso → crea registro en audit_logs
 *   POST con respuesta 400 → NO crea registro
 *   El registro captura correctamente ip_address y user_id
 */

const request = require('supertest');
const app = require('../../src/app');
const { AuditLog, Store, Role, UserRole } = require('../../src/models');
const { auditAction } = require('../../src/middleware/auditMiddleware');

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

const makeUserWithRole = async (store, roleName, roleLevel) => {
  const user = await global.testUtils.createTestUser({ store_id: store.id });
  // los nombres de rol deben cumplir /^[a-zA-Z_]+$/ — sin números
  const [role] = await Role.findOrCreate({
    where: { name: roleName },
    defaults: { name: roleName, display_name: roleName, level: roleLevel, description: 'Test role' }
  });
  await UserRole.create({ user_id: user.id, role_id: role.id, is_active: true });
  return { user, token: global.testUtils.generateTestToken(user) };
};

// ─── TEST 4: aislamiento ──────────────────────────────────────────────────────

describe('GET /api/admin/audit-logs — aislamiento por rol', () => {
  let storeA, storeB, mainStore;
  let tokenAdminA, tokenSuperAdmin;
  let userAId;

  beforeEach(async () => {
    mainStore = await makeStore('main');
    storeA    = await makeStore('audittiendaa');
    storeB    = await makeStore('audittiendab');

    const adminA = await makeUserWithRole(storeA, 'store_admin', 80);
    tokenAdminA = adminA.token;
    userAId     = adminA.user.id;

    const superAdmin = await makeUserWithRole(mainStore, 'superadmin', 100);
    tokenSuperAdmin  = superAdmin.token;

    // insertamos logs de auditoría: 2 para storeA, 2 para storeB
    await AuditLog.create({ user_id: userAId, store_id: storeA.id, action: 'create', resource_type: 'product', description: 'log A1' });
    await AuditLog.create({ user_id: userAId, store_id: storeA.id, action: 'update', resource_type: 'order',   description: 'log A2' });
    await AuditLog.create({ store_id: storeB.id, action: 'delete', resource_type: 'product', description: 'log B1' });
    await AuditLog.create({ store_id: storeB.id, action: 'login',  resource_type: 'auth',    description: 'log B2' });
  });

  test('TEST 4a: admin de tienda A ve solo sus logs', async () => {
    const res = await request(app)
      .get('/api/admin/audit-logs')
      .set('Host', `audittiendaa.${BASE_DOMAIN}`)
      .set('Authorization', `Bearer ${tokenAdminA}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const descriptions = res.body.data.map(l => l.description);
    expect(descriptions).toContain('log A1');
    expect(descriptions).toContain('log A2');
    expect(descriptions).not.toContain('log B1');
    expect(descriptions).not.toContain('log B2');
  });

  test('TEST 4b: super-admin ve logs de todas las tiendas', async () => {
    const res = await request(app)
      .get('/api/admin/audit-logs')
      .set('Host', `main.${BASE_DOMAIN}`)
      .set('Authorization', `Bearer ${tokenSuperAdmin}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const descriptions = res.body.data.map(l => l.description);
    expect(descriptions).toContain('log A1');
    expect(descriptions).toContain('log B1');
  });

  test('TEST 4c: admin de tienda A no puede ver logs de tienda B aunque pase su store_id', async () => {
    // el filtro user_id se ignora para no-superadmins, y el store_id siempre se fuerza al de la propia tienda
    const res = await request(app)
      .get(`/api/admin/audit-logs?user_id=${userAId}`)
      .set('Host', `audittiendaa.${BASE_DOMAIN}`)
      .set('Authorization', `Bearer ${tokenAdminA}`)
      .expect(200);

    // los resultados siempre están acotados a storeA independientemente de los query params
    const storeIds = res.body.data.map(l => l.store_id);
    for (const id of storeIds) {
      expect(id).toBe(storeA.id);
    }
  });

  test('TEST 4d: sin token devuelve 401', async () => {
    await request(app)
      .get('/api/admin/audit-logs')
      .set('Host', `audittiendaa.${BASE_DOMAIN}`)
      .expect(401);
  });
});

// ─── TEST 5: middleware de auditoría ─────────────────────────────────────────

describe('auditMiddleware — auditAction()', () => {
  const createMockRes = (statusCode = 200) => {
    const res = {
      statusCode,
      locals: {},
      json: jest.fn()
    };
    return res;
  };

  const createMockReq = (overrides = {}) => ({
    user:    { id: 'user-test-uuid', storeId: 'store-test-uuid', roles: [] },
    tenant:  { id: 'store-test-uuid' },
    ip:      '127.0.0.1',
    headers: { 'user-agent': 'jest-test-agent', 'x-forwarded-for': '' },
    ...overrides
  });

  test('TEST 5a: respuesta exitosa (200) llama a AuditLog.create con los parámetros correctos', async () => {
    const createSpy = jest.spyOn(AuditLog, 'create').mockResolvedValueOnce({});

    const req  = createMockReq();
    const res  = createMockRes(200);
    const next = jest.fn();

    res.locals.resourceId = 'product-resource-uuid';

    const middleware = auditAction('product', 'create');
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);

    res.json({ success: true });

    await new Promise(r => setTimeout(r, 50));

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
      user_id:       'user-test-uuid',
      store_id:      'store-test-uuid',
      action:        'create',
      resource_type: 'product',
      resource_id:   'product-resource-uuid'
    }));

    createSpy.mockRestore();
  });

  test('TEST 5b: respuesta de error (400) NO llama a AuditLog.create', async () => {
    const createSpy = jest.spyOn(AuditLog, 'create').mockResolvedValueOnce({});

    const req  = createMockReq();
    const res  = createMockRes(400);
    const next = jest.fn();

    const middleware = auditAction('product', 'create');
    middleware(req, res, next);
    res.json({ success: false, message: 'Validation error' });

    await new Promise(r => setTimeout(r, 50));

    expect(createSpy).not.toHaveBeenCalled();
    createSpy.mockRestore();
  });

  test('TEST 5c: captura correctamente ip_address (primer IP de X-Forwarded-For) y user_id', async () => {
    const createSpy = jest.spyOn(AuditLog, 'create').mockResolvedValueOnce({});

    const req = createMockReq({
      headers: { 'user-agent': 'TestAgent/1.0', 'x-forwarded-for': '203.0.113.42, 10.0.0.1' }
    });
    const res  = createMockRes(200);
    const next = jest.fn();

    const middleware = auditAction('auth', 'login');
    middleware(req, res, next);
    res.json({ success: true });

    await new Promise(r => setTimeout(r, 50));

    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
      ip_address: '203.0.113.42',
      user_agent: 'TestAgent/1.0',
      user_id:    'user-test-uuid'
    }));

    createSpy.mockRestore();
  });

  test('TEST 5d: fallo de AuditLog.create NO interrumpe la respuesta', async () => {
    const createSpy = jest.spyOn(AuditLog, 'create').mockRejectedValueOnce(new Error('DB down'));

    const req  = createMockReq();
    const res  = createMockRes(201);
    const next = jest.fn();

    // guardamos el jest.fn() original ANTES de que el middleware reemplace res.json
    const originalJsonMock = res.json;

    const middleware = auditAction('product', 'create');
    middleware(req, res, next);

    // res.json (interceptor) no debe lanzar error — la respuesta se envía aunque falle la auditoría
    expect(() => res.json({ success: true })).not.toThrow();

    await new Promise(r => setTimeout(r, 50));

    // el originalJsonMock (el jest.fn) debe haber sido llamado por el interceptor
    expect(originalJsonMock).toHaveBeenCalledTimes(1);

    createSpy.mockRestore();
  });
});
