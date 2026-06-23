const request = require('supertest');
const app = require('../../src/app');
const { User, Store } = require('../../src/models');

describe('Auth API Integration Tests', () => {
  describe('POST /api/public/register', () => {
    test('should register a new user successfully', async () => {
      const store = await Store.create({
        name: 'Public Register Store',
        subdomain: 'publicstore',
        is_active: true
      });

      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        first_name: 'New',
        last_name: 'User'
      };

      const response = await request(app)
        .post('/api/public/register')
        .set('Host', `${store.subdomain}.${process.env.TENANT_BASE_DOMAIN || 'neonhub.es'}`)
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.username).toBe('newuser');
      expect(response.body.data.user.email).toBe('newuser@example.com');
      expect(response.body.data.requiresVerification).toBe(true);

      // comprobamos que el usuario se creó en la base de datos
      const user = await User.findOne({ where: { username: 'newuser' } });
      expect(user).toBeTruthy();
      expect(user.email).toBe('newuser@example.com');
    });

    test('should fail with invalid email format', async () => {
      const store = await Store.create({
        name: 'Public Register Store 2',
        subdomain: 'publicstore2',
        is_active: true
      });

      const userData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'SecurePass123!',
        first_name: 'Test',
        last_name: 'User'
      };

      const response = await request(app)
        .post('/api/public/register')
        .set('Host', `${store.subdomain}.${process.env.TENANT_BASE_DOMAIN || 'neonhub.es'}`)
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    test('should fail with weak password', async () => {
      const store = await Store.create({
        name: 'Public Register Store 3',
        subdomain: 'publicstore3',
        is_active: true
      });

      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: '123', // contraseña demasiado débil
        first_name: 'Test',
        last_name: 'User'
      };

      const response = await request(app)
        .post('/api/public/register')
        .set('Host', `${store.subdomain}.${process.env.TENANT_BASE_DOMAIN || 'neonhub.es'}`)
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    test('should fail with duplicate username', async () => {
      const store = await Store.create({
        name: 'Public Register Store 4',
        subdomain: 'publicstore4',
        is_active: true
      });

      // creamos el primer usuario
      await global.testUtils.createTestUser({ username: 'duplicate' });

      const userData = {
        username: 'duplicate',
        email: 'different@example.com',
        password: 'SecurePass123!',
        first_name: 'Duplicate',
        last_name: 'User'
      };

      const response = await request(app)
        .post('/api/public/register')
        .set('Host', `${store.subdomain}.${process.env.TENANT_BASE_DOMAIN || 'neonhub.es'}`)
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // creamos el usuario de prueba para los tests de login
      await global.testUtils.createTestUser({
        username: 'loginuser',
        email: 'login@example.com'
      });
    });

    test('should login with valid credentials (username)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'loginuser',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user.username).toBe('loginuser');
    });

    test('should login with valid credentials (email)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'login@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.accessToken).toBeDefined();
    });

    test('should fail with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'loginuser',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message.toLowerCase()).toContain('credenciales');
    });

    test('should fail with non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'nonexistent',
          password: 'password123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should fail with inactive user', async () => {
      await global.testUtils.createTestUser({
        username: 'inactive',
        email: 'inactive@example.com',
        is_active: false
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'inactive',
          password: 'password123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/profile', () => {
    let authToken;
    let testUser;

    beforeEach(async () => {
      testUser = await global.testUtils.createTestUser({
        username: 'profileuser',
        email: 'profile@example.com'
      });
      authToken = global.testUtils.generateTestToken(testUser);
    });

    test('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.username).toBe('profileuser');
      expect(response.body.data.user.email).toBe('profile@example.com');
      // la contraseña no debe estar incluida en la respuesta
      expect(response.body.data.user.password).toBeUndefined();
    });

    test('should fail without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TOKEN_REQUIRED');
    });

    test('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should fail with expired token', async () => {
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { id: testUser.id, username: testUser.username },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // caducado hace 1 hora
      );

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/auth/change-password', () => {
    let authToken;
    let testUser;

    beforeEach(async () => {
      testUser = await global.testUtils.createTestUser({
        username: 'changepassuser',
        email: 'changepass@example.com'
      });
      authToken = global.testUtils.generateTestToken(testUser);
    });

    test('should change password with valid current password', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'NewSecurePass456!',
          confirmPassword: 'NewSecurePass456!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('actualizada');

      // comprobamos que la nueva contraseña funciona
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'changepassuser',
          password: 'NewSecurePass456!'
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    test('should fail with incorrect current password', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'NewSecurePass456!',
          confirmPassword: 'NewSecurePass456!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should fail when passwords do not match', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'NewSecurePass456!',
          confirmPassword: 'DifferentPassword!'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should fail with weak new password', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: '123',
          confirmPassword: '123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/verify', () => {
    let authToken;
    let testUser;

    beforeEach(async () => {
      testUser = await global.testUtils.createTestUser();
      authToken = global.testUtils.generateTestToken(testUser);
    });

    test('should verify valid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('válido');
    });

    test('should fail to verify invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
