/**
 * Tests de integración: aislamiento por tenant en SupportTickets
 *
 * Cubre las 3 vulnerabilidades corregidas en el Bloque 1 (tickets):
 *   VULN-4  getAllTickets   — se aplica filtro store_id cuando existe tenant
 *   VULN-5  getTicketDetails — findOne con guard de store_id
 *   VULN-6a GET /customer  — el endpoint ahora requiere autenticación (401 sin token)
 *   VULN-6b GET /customer  — resultados acotados al tenant actual
 *   VULN-4b superadmin     — sin contexto de tenant → sin filtro → ve todos los tickets
 */

const request = require('supertest');
const app = require('../../src/app');
const { SupportTicket, Store, Role, UserRole } = require('../../src/models');
const ticketController = require('../../src/controllers/ticketController');

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

const makeTicket = (storeId, overrides = {}) =>
  SupportTicket.create({
    customer_email: 'customer@test.com',
    subject: `Ticket of ${storeId}`,
    message: 'Test message',
    store_id: storeId,
    ...overrides
  });

/** devuelve un token de superadmin para un usuario de la tienda principal */
const makeSuperadmin = async (mainStore) => {
  const adminUser = await global.testUtils.createTestUser({
    store_id: mainStore.id,
    username: `superadmin_${Math.random().toString(36).slice(2, 7)}`,
    email: `superadmin_${Math.random().toString(36).slice(2, 7)}@test.com`
  });

  const [role] = await Role.findOrCreate({
    where: { name: 'superadmin' },
    defaults: { name: 'superadmin', display_name: 'Super Admin', level: 100, description: 'Platform super admin' }
  });

  await UserRole.create({ user_id: adminUser.id, role_id: role.id, is_active: true });
  return { adminUser, token: global.testUtils.generateTestToken(adminUser) };
};

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('Ticket tenant isolation', () => {
  let mainStore, storeA, storeB;
  let tokenAdmin;

  beforeEach(async () => {
    mainStore = await makeStore('main');
    storeA    = await makeStore('tiendaa');
    storeB    = await makeStore('tiendab');

    const sa = await makeSuperadmin(mainStore);
    tokenAdmin = sa.token;
  });

  // ── VULN-4: getAllTickets scoped by tenant ──────────────────────────────────

  test('VULN-4: admin on main subdomain sees only main-store tickets, not store B', async () => {
    await makeTicket(mainStore.id, { subject: 'Ticket Main' });
    await makeTicket(storeB.id,   { subject: 'Ticket B — must be hidden' });

    const res = await request(app)
      .get('/api/tickets/admin')
      .set('Host', `main.${BASE_DOMAIN}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const subjects = res.body.data.map((t) => t.subject);
    expect(subjects).toContain('Ticket Main');
    expect(subjects).not.toContain('Ticket B — must be hidden');
  });

  // ── VULN-5: getTicketDetails scoped by tenant ──────────────────────────────

  test('VULN-5: admin on main subdomain gets 404 when requesting a store-B ticket by ID', async () => {
    const ticketB = await makeTicket(storeB.id, { subject: 'Confidential B' });

    const res = await request(app)
      .get(`/api/tickets/admin/${ticketB.id}`)
      .set('Host', `main.${BASE_DOMAIN}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404);

    expect(res.body.success).toBe(false);
  });

  test('VULN-5: admin on main subdomain CAN access a ticket that belongs to main store', async () => {
    const ticketMain = await makeTicket(mainStore.id, { subject: 'Main Store Ticket' });

    const res = await request(app)
      .get(`/api/tickets/admin/${ticketMain.id}`)
      .set('Host', `main.${BASE_DOMAIN}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(ticketMain.id);
  });

  // ── VULN-6a: GET /customer requiere autenticación ──────────────────────────

  test('VULN-6a: GET /customer without token returns 401', async () => {
    await request(app)
      .get('/api/tickets/customer')
      .query({ email: 'anyone@test.com' })
      .set('Host', `tiendaa.${BASE_DOMAIN}`)
      .expect(401);
  });

  // ── VULN-6b: GET /customer limitado al tenant actual ───────────────────────

  test('VULN-6b: GET /customer with token returns only tickets from current tenant', async () => {
    const sharedEmail = 'shared@customer.com';

    const userA = await global.testUtils.createTestUser({ store_id: storeA.id });
    const tokenA = global.testUtils.generateTestToken(userA);

    await makeTicket(storeA.id, { customer_email: sharedEmail, subject: 'Visible — storeA' });
    await makeTicket(storeB.id, { customer_email: sharedEmail, subject: 'Hidden — storeB' });

    const res = await request(app)
      .get('/api/tickets/customer')
      .query({ email: sharedEmail })
      .set('Host', `tiendaa.${BASE_DOMAIN}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const subjects = res.body.data.map((t) => t.subject);
    expect(subjects).toContain('Visible — storeA');
    expect(subjects).not.toContain('Hidden — storeB');
  });

  // ── VULN-4b: superadmin sin contexto de tenant ve todos los tickets ─────────
  //
  // superAdminMiddleware exige subdomain === 'main' para acceso HTTP, así que la
  // ruta "sin tenant" solo es alcanzable cuando tenantContext resuelve null (p.ej.
  // localhost o IP). Probamos el controlador directamente para verificar ese branch.

  test('VULN-4b (unit): controller returns all tickets when req.tenant is null', async () => {
    await makeTicket(storeA.id, { subject: 'Ticket storeA' });
    await makeTicket(storeB.id, { subject: 'Ticket storeB' });

    const captured = [];
    const mockReq = { query: {}, tenant: null };
    const mockRes = {
      json: (body) => { captured.push(body); },
      status: () => mockRes
    };

    await ticketController.getAllTickets(mockReq, mockRes);

    expect(captured.length).toBe(1);
    expect(captured[0].success).toBe(true);
    const subjects = captured[0].data.map((t) => t.subject);
    expect(subjects).toContain('Ticket storeA');
    expect(subjects).toContain('Ticket storeB');
  });
});
