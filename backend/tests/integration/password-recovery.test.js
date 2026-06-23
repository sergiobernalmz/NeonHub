const request = require('supertest');
const app = require('../../src/app');

describe('Password Recovery Tests', () => {
  let testStore, testUser;

  beforeEach(async () => {
    testStore = await global.testUtils.createTestStore();
    testUser = await global.testUtils.createTestUser({
      username: 'recovery_user',
      email: 'recovery@test.com',
      store_id: testStore.id
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/auth/forgot-password
  // ---------------------------------------------------------------------------
  describe('POST /api/auth/forgot-password', () => {
    test('returns 200 with generic message for a registered email', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'recovery@test.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe(
        'Si el email está registrado, recibirás un enlace de recuperación en breve.'
      );
    });

    test('returns 200 with identical message for an unregistered email (no enumeration)', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'doesnotexist@test.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe(
        'Si el email está registrado, recibirás un enlace de recuperación en breve.'
      );
    });

    test('stores password_reset_token and password_reset_expires in DB for registered user', async () => {
      const { User } = global.testUtils.getModels();

      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'recovery@test.com' })
        .expect(200);

      const updated = await User.unscoped().findOne({
        where: { email: 'recovery@test.com' }
      });
      expect(updated.password_reset_token).toBeTruthy();
      expect(updated.password_reset_expires).toBeTruthy();
      expect(new Date(updated.password_reset_expires) > new Date()).toBe(true);
    });

    test('returns 400 when email field is missing', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/auth/reset-password
  // ---------------------------------------------------------------------------
  describe('POST /api/auth/reset-password', () => {
    let resetToken;

    beforeEach(async () => {
      // metemos un token de reset válido directamente en la BD
      const crypto = require('crypto');
      resetToken = crypto.randomBytes(32).toString('hex');
      await testUser.update({
        password_reset_token: resetToken,
        password_reset_expires: new Date(Date.now() + 60 * 60 * 1000) // expira en 1 hora
      });
    });

    test('resets password and clears token when token is valid', async () => {
      const { User } = global.testUtils.getModels();

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: resetToken, password: 'NewPassword123!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // el token debe haberse borrado
      const updated = await User.unscoped().findByPk(testUser.id);
      expect(updated.password_reset_token).toBeNull();
      expect(updated.password_reset_expires).toBeNull();
    });

    test('new password works for login after successful reset', async () => {
      await request(app)
        .post('/api/auth/reset-password')
        .send({ token: resetToken, password: 'NewPassword123!' })
        .expect(200);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ login: 'recovery_user', password: 'NewPassword123!' });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.accessToken).toBeDefined();
    });

    test('returns 400 for an expired token', async () => {
      // sobreescribimos con un token ya caducado
      const crypto = require('crypto');
      const expiredToken = crypto.randomBytes(32).toString('hex');
      await testUser.update({
        password_reset_token: expiredToken,
        password_reset_expires: new Date(Date.now() - 1000) // 1 segundo en el pasado (token expirado)
      });

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: expiredToken, password: 'NewPassword123!' });

      expect(res.status).toBe(400);
    });

    test('returns 400 for a token that does not exist in DB', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'completely-fake-token-that-never-existed', password: 'NewPassword123!' });

      expect(res.status).toBe(400);
    });

    test('returns 400 when token is reused after a successful reset', async () => {
      // primer uso — debe funcionar
      await request(app)
        .post('/api/auth/reset-password')
        .send({ token: resetToken, password: 'NewPassword123!' })
        .expect(200);

      // segundo uso del mismo token — el token se borró, debe fallar
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: resetToken, password: 'AnotherPassword456!' });

      expect(res.status).toBe(400);
    });

    test('returns 400 when password field is missing', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: resetToken });

      expect(res.status).toBe(400);
    });

    test('returns 400 when new password is too short', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: resetToken, password: 'short' });

      expect(res.status).toBe(400);
    });
  });
});