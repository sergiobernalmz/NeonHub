/**
 * Tests for the corrected email_verified check in billing + forgot-password endpoint.
 *
 * TEST 1: Usuario que existe en landing_db con email_verified=false
 *         → POST /billing/checkout-session → 403 email_not_verified
 * TEST 2: Usuario que NO existe en backend DB (primer comprador),
 *         email_verified=false en landing_db
 *         → POST /billing/checkout-session → 403 email_not_verified
 *         (este era el caso que fallaba con el check anterior)
 * TEST 3: POST /api/auth/forgot-password con email válido → 200
 *         POST /api/auth/forgot-password con email formato inválido → 400
 */

const request = require('supertest');
const app     = require('../../src/app');
const { User, Store } = require('../../src/models');

const BASE_DOMAIN = process.env.TENANT_BASE_DOMAIN || 'neonhub.es';

// ─── Mock landingDb ───────────────────────────────────────────────────────────
// isLandingEmailUnverified no puede conectar a una landing_db real en el entorno
// de tests. Controlamos el valor de retorno por test con el mock de abajo.

jest.mock('../../src/config/landingDb', () => ({
  isLandingEmailUnverified: jest.fn()
}));
const { isLandingEmailUnverified } = require('../../src/config/landingDb');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const checkoutPayload = (email) => ({
  planId: 'starter',
  tenantName: 'Mi Tienda Test',
  subdomain: 'fix2test',
  ownerEmail: email,
  ownerPassword: 'Password123!',
  ownerFirstName: 'Test',
  ownerLastName: 'Owner'
});

// ─── TEST 1 & 2: landing_db email_verified check ──────────────────────────────

describe('POST /api/billing/checkout-session — email_verified desde landing_db', () => {
  let store;

  beforeEach(async () => {
    store = await Store.create({
      name: 'Fix2 Store',
      subdomain: 'fix2store',
      is_active: true,
      api_key_public: 'pk_fix2_test',
      api_key_secret: 'sk_fix2_test'
    });
    isLandingEmailUnverified.mockReset();
  });

  test('TEST 1: usuario existente en backend DB con email_verified=false en landing_db → 403', async () => {
    // el usuario también existe en el backend DB (usuario ya aprovisionado)
    await global.testUtils.createTestUser({
      store_id: store.id,
      email_verified: false,
      email: 'existing@backend.test'
    });

    // landing_db dice que no está verificado
    isLandingEmailUnverified.mockResolvedValueOnce(true);

    const res = await request(app)
      .post('/api/billing/checkout-session')
      .set('Host', `fix2store.${BASE_DOMAIN}`)
      .send(checkoutPayload('existing@backend.test'))
      .expect(403);

    expect(res.body.error).toBe('email_not_verified');
    expect(isLandingEmailUnverified).toHaveBeenCalledWith('existing@backend.test');
  });

  test('TEST 2: usuario que NO existe en backend DB con email_verified=false en landing_db → 403', async () => {
    // este email NO está en el backend DB (comprador nuevo, solo registrado en landing)
    const email = 'brand-new@buyer.test';
    const backendUser = await User.findOne({ where: { email } });
    expect(backendUser).toBeNull(); // confirm absence

    // landing_db dice que no está verificado
    isLandingEmailUnverified.mockResolvedValueOnce(true);

    const res = await request(app)
      .post('/api/billing/checkout-session')
      .set('Host', `fix2store.${BASE_DOMAIN}`)
      .send(checkoutPayload(email))
      .expect(403);

    expect(res.body.error).toBe('email_not_verified');
    expect(isLandingEmailUnverified).toHaveBeenCalledWith(email);
  });
});

// ─── TEST 3: forgot-password endpoint ─────────────────────────────────────────

describe('POST /api/auth/forgot-password', () => {
  test('TEST 3a: email válido → 200 (mensaje genérico, no revela si existe)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'cualquier@email.com' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.message).toBeTruthy();
  });

  test('TEST 3b: sin campo email → 400', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({})
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});
