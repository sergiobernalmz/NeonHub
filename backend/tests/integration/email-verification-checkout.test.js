/**
 * Tests: email_verified enforcement on checkout + unverified-users endpoint
 *
 * TEST 1: Usuario email_verified=false → POST /billing/checkout-session → 403
 * TEST 2: Usuario email_verified=true  → POST /billing/checkout-session → continúa (no bloquea)
 * TEST 3: verifyEmail con tienda pendiente → user.store_id queda asignado
 * TEST 4: GET /api/auth/unverified-users sin API key → 401
 * TEST 5: GET /api/auth/unverified-users con API key válida → solo usuarios no verificados >24h
 */

const request = require('supertest');
const app     = require('../../src/app');
const { User, Store, ProvisioningJob, StripeEvent, Role, UserRole } = require('../../src/models');

const BASE_DOMAIN = process.env.NODE_ENV === 'test'
  ? process.env.TENANT_BASE_DOMAIN || 'neonhub.es'
  : 'neonhub.es';

process.env.SERVICE_API_KEY = 'test-service-api-key-for-tests';

// mockeamos landing_db — no está disponible en el entorno de tests
jest.mock('../../src/config/landingDb', () => ({
  isLandingEmailUnverified: jest.fn()
}));
const { isLandingEmailUnverified } = require('../../src/config/landingDb');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeStore = (subdomain) =>
  Store.create({
    name: `Store ${subdomain}`,
    subdomain,
    is_active: true,
    api_key_public: `pk_${subdomain}_test`,
    api_key_secret: `sk_${subdomain}_test`
  });

const makeRoleAndToken = async (user, roleName, roleLevel) => {
  const [role] = await Role.findOrCreate({
    where: { name: roleName },
    defaults: { name: roleName, display_name: roleName, level: roleLevel, description: 'Test' }
  });
  await UserRole.findOrCreate({ where: { user_id: user.id, role_id: role.id }, defaults: { is_active: true } });
  return global.testUtils.generateTestToken(user);
};

// ─── TEST 1 & 2: checkout blocked/unblocked by email_verified ─────────────────

describe('POST /api/billing/checkout-session — email_verified check', () => {
  let store;

  beforeEach(async () => {
    store = await makeStore('chkout');
    isLandingEmailUnverified.mockReset();
  });

  const checkoutPayload = (email) => ({
    planId: 'starter',
    tenantName: 'Mi Tienda Test',
    subdomain: 'mititest',
    ownerEmail: email,
    ownerPassword: 'Password123!',
    ownerFirstName: 'Test',
    ownerLastName: 'Owner'
  });

  test('TEST 1: usuario email_verified=false → 403 con error email_not_verified', async () => {
    const unverifiedUser = await global.testUtils.createTestUser({
      store_id: store.id,
      email_verified: false,
      email: 'unverified@test.com'
    });

    isLandingEmailUnverified.mockResolvedValueOnce(true);

    const res = await request(app)
      .post('/api/billing/checkout-session')
      .set('Host', `chkout.${BASE_DOMAIN}`)
      .send(checkoutPayload(unverifiedUser.email))
      .expect(403);

    expect(res.body.error).toBe('email_not_verified');
    expect(res.body.success).toBe(false);
  });

  test('TEST 2: usuario email_verified=true → no bloqueado por verificación (pasa validación de email)', async () => {
    const verifiedUser = await global.testUtils.createTestUser({
      store_id: store.id,
      email_verified: true,
      email: 'verified@test.com'
    });

    // landing_db confirma que el usuario SÍ está verificado
    isLandingEmailUnverified.mockResolvedValueOnce(false);

    const res = await request(app)
      .post('/api/billing/checkout-session')
      .set('Host', `chkout.${BASE_DOMAIN}`)
      .send(checkoutPayload(verifiedUser.email));

    // no debe bloquearse con 403 por email_not_verified
    expect(res.status).not.toBe(403);
    if (res.body.error) {
      expect(res.body.error).not.toBe('email_not_verified');
    }
  });

  test('TEST 2b: fallo de landing_db → 503 service_unavailable', async () => {
    isLandingEmailUnverified.mockRejectedValueOnce(new Error('Connection refused'));

    const res = await request(app)
      .post('/api/billing/checkout-session')
      .set('Host', `chkout.${BASE_DOMAIN}`)
      .send(checkoutPayload('anyuser@test.com'))
      .expect(503);

    expect(res.body.error).toBe('service_unavailable');
    expect(res.body.success).toBe(false);
  });
});

// ─── TEST 3: verifyEmail con tienda pendiente ─────────────────────────────────

describe('POST /api/auth/verify-email — completar asociación de tienda', () => {
  let store;

  beforeEach(async () => {
    store = await makeStore('verifytest');
  });

  test('TEST 3: verificar email cuando hay ProvisioningJob completado → store_id asignado', async () => {
    const user = await User.create({
      username: 'limbo_user_test',
      email: 'limbo@verify.test',
      password_hash: 'fakehash',
      first_name: 'Limbo',
      last_name: 'User',
      is_active: true,
      email_verified: false,
      verification_token: 'test-verify-token-limbo',
      store_id: null
    });

    // creamos un ProvisioningJob completado con este email en el payload
    const stripeEvt = await StripeEvent.create({
      id: 'evt_test_limbo_verify',
      type: 'checkout.session.completed',
      status: 'processed',
      payload: {},
      received_at: new Date()
    });
    await ProvisioningJob.create({
      stripe_event_id: stripeEvt.id,
      store_id: store.id,
      status: 'completed',
      payload: { owner_email: 'limbo@verify.test', tenant_name: 'test', subdomain: 'verifytest' },
      processed_at: new Date()
    });

    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: 'test-verify-token-limbo' })
      .expect(200);

    expect(res.body.success).toBe(true);

    const updated = await User.findByPk(user.id);
    expect(updated.email_verified).toBe(true);
    expect(updated.store_id).toBe(store.id);
  });
});

// ─── TEST 4 & 5: GET /api/auth/unverified-users ───────────────────────────────

describe('GET /api/auth/unverified-users — API key auth', () => {
  beforeEach(async () => {
    // creamos varios usuarios con distintos estados
    const store = await makeStore('unvtest');

    // no verificado + más de 24h (debe aparecer)
    // usamos fake timers para que el auto-timestamp de Sequelize quede en el pasado
    const pastTime = Date.now() - 25 * 60 * 60 * 1000;
    jest.useFakeTimers({ now: pastTime });
    await User.create({
      username: 'old_unverified',
      email: 'old@unverified.test',
      password_hash: 'fakehash',
      first_name: 'Old', last_name: 'Unverified',
      is_active: true,
      email_verified: false,
      store_id: store.id
    });
    jest.useRealTimers();

    // no verificado pero hace menos de 24h (NO debe aparecer)
    await User.create({
      username: 'new_unverified',
      email: 'new@unverified.test',
      password_hash: 'fakehash',
      first_name: 'New', last_name: 'Unverified',
      is_active: true,
      email_verified: false,
      store_id: store.id
    });

    // verificado (NO debe aparecer)
    await global.testUtils.createTestUser({ store_id: store.id, email_verified: true });
  });

  test('TEST 4: sin API key → 401', async () => {
    await request(app)
      .get('/api/auth/unverified-users')
      .expect(401);
  });

  test('TEST 5: con API key válida → solo usuarios no verificados creados hace >24h', async () => {
    const res = await request(app)
      .get('/api/auth/unverified-users')
      .set('x-service-api-key', 'test-service-api-key-for-tests')
      .expect(200);

    expect(res.body.success).toBe(true);
    const emails = res.body.data.map(u => u.email);

    // el usuario no verificado antiguo debe aparecer
    expect(emails).toContain('old@unverified.test');

    // el usuario no verificado reciente NO debe aparecer
    expect(emails).not.toContain('new@unverified.test');

    // solo deben aparecer los campos esperados
    for (const u of res.body.data) {
      expect(u).toHaveProperty('id');
      expect(u).toHaveProperty('email');
      expect(u).toHaveProperty('username');
      expect(u).toHaveProperty('created_at');
      expect(u).toHaveProperty('store_id');
      expect(u).not.toHaveProperty('password_hash');
    }
  });
});
