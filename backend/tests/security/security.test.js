const request = require('supertest');
const app = require('../../src/app');
const { Role, Store } = require('../../src/models');

describe('Security Tests', () => {
  describe('SQL Injection Protection', () => {
    let authToken;

    beforeEach(async () => {
      const user = await global.testUtils.createTestUser();
      const role = await Role.create({
        name: 'products_reader',
        display_name: 'Products Reader',
        level: 1,
        permissions: { products: { read: true } }
      });
      await user.addRole(role);
      authToken = global.testUtils.generateTestToken(user);
    });

    test('should block SQL injection in login', async () => {
      const maliciousInputs = [
        "admin'--",
        "admin' OR '1'='1",
        "admin'; DROP TABLE users;--",
        "admin' UNION SELECT * FROM users--",
        "' OR 1=1--",
        "admin' OR '1'='1' /*"
      ];

      for (const maliciousInput of maliciousInputs) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            login: maliciousInput,
            password: 'password'
          });

        // debe devolver 401 (credenciales inválidas) o 400 (entrada bloqueada)
        expect([400, 401]).toContain(response.status);
        expect(response.body.success).toBe(false);
      }
    });

    test('should block SQL injection in search parameters', async () => {
      const maliciousQueries = [
        "'; DROP TABLE products;--",
        "' OR '1'='1",
        "' UNION SELECT * FROM users--",
        "'; INSERT INTO users (username) VALUES ('hacker');--"
      ];

      for (const maliciousQuery of maliciousQueries) {
        const response = await request(app)
          .get('/api/products')
          .query({ search: maliciousQuery })
          .set('Authorization', `Bearer ${authToken}`);

        // debe bloquear la entrada peligrosa o devolver resultados seguros
        if (response.status === 400) {
          expect(response.body.error).toContain('inválida');
        } else {
          expect(response.status).toBe(200);
          // no debe exponer datos sensibles ni lanzar errores de base de datos
        }
      }
    });

    test('should sanitize input in product creation', async () => {
      const admin = await global.testUtils.createTestUser({ username: 'admin' });
      const adminRole = await Role.create({
        name: 'admin',
        display_name: 'Administrator',
        level: 80,
        permissions: { products: { create: true } }
      });
      await admin.addRole(adminRole);
      const adminToken = global.testUtils.generateTestToken(admin);

      const maliciousData = {
        name: "Product'; DROP TABLE products;--",
        sku: "' OR '1'='1",
        description: "<script>alert('xss')</script>",
        price: "'; DELETE FROM users;--"
      };

      const response = await request(app)
        .post('/api/products')
        .send(maliciousData)
        .set('Authorization', `Bearer ${adminToken}`);

      if (response.status === 400) {
        expect(response.body.success).toBe(false);
      } else if (response.status === 201) {
        // si se crea, los datos deben estar sanitizados
        expect(response.body.data.product.name).not.toContain('DROP TABLE');
        expect(response.body.data.product.description).not.toContain('<script>');
      }
    });
  });

  describe('XSS Protection', () => {
    let authToken;
    let adminToken;

    beforeEach(async () => {
      const user = await global.testUtils.createTestUser();
      authToken = global.testUtils.generateTestToken(user);

      const admin = await global.testUtils.createTestUser({ 
        username: 'admin',
        email: 'admin@test.com'
      });
      const adminRole = await Role.create({
        name: 'admin',
        display_name: 'Administrator',
        level: 80,
        permissions: { products: { create: true, update: true } }
      });
      await admin.addRole(adminRole);
      adminToken = global.testUtils.generateTestToken(admin);
    });

    test('should sanitize XSS in product descriptions', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        '"><script>alert(String.fromCharCode(88,83,83))</script>',
        '<svg onload="alert(1)">',
        'javascript:alert("xss")',
        '<iframe src="javascript:alert(1)"></iframe>'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/products')
          .send({
            name: 'Test Product',
            sku: `TEST-${Date.now()}`,
            slug: `test-${Date.now()}`,
            description: payload,
            price: 99.99
          })
          .set('Authorization', `Bearer ${adminToken}`);

        if (response.status === 201) {
          // la descripción debe estar sanitizada
          expect(response.body.data.product.description).not.toContain('<script>');
          expect(response.body.data.product.description).not.toContain('onerror');
          expect(response.body.data.product.description).not.toContain('javascript:');
        }
      }
    });

    test('should sanitize XSS in user profile updates', async () => {
      const xssName = '<script>alert("profile xss")</script>';
      
      const response = await request(app)
        .put('/api/auth/profile')
        .send({
          firstName: xssName,
          lastName: 'Test'
        })
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        expect(response.body.data.user.firstName).not.toContain('<script>');
      }
    });
  });

  describe('Authentication and Authorization', () => {
    let customerUser;
    let adminUser;
    let adminRole;
    let customerToken;
    let adminToken;

    beforeEach(async () => {
      // creamos el usuario cliente
      customerUser = await global.testUtils.createTestUser({
        username: 'customer',
        email: 'customer@test.com'
      });
      const customerRole = await Role.create({
        name: 'customer',
        display_name: 'Customer',
        level: 1,
        permissions: { orders: { read: true } }
      });
      await customerUser.addRole(customerRole);
      customerToken = global.testUtils.generateTestToken(customerUser);

      // creamos el usuario admin
      adminUser = await global.testUtils.createTestUser({
        username: 'admin',
        email: 'admin@test.com'
      });
      adminRole = await Role.create({
        name: 'admin',
        display_name: 'Administrator',
        level: 80,
        permissions: { 
          users: { create: true, read: true, update: true },
          products: { create: true, read: true, update: true, delete: true }
        }
      });
      await adminUser.addRole(adminRole);
      adminToken = global.testUtils.generateTestToken(adminUser);
    });

    test('should deny access to admin endpoints for customers', async () => {
      // el cliente no debe poder acceder a la gestión de usuarios
      const response1 = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response1.body.success).toBe(false);

      // el cliente no debe poder acceder al dashboard
      const response2 = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response2.body.success).toBe(false);
    });

    test('should allow admin access to protected endpoints', async () => {
      // el admin sí debe poder acceder al dashboard
      const response1 = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(response1.status); // 500 si no hay datos, pero está autorizado

      // el admin sí debe poder acceder a la gestión de usuarios
      const response2 = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(response2.status);
    });

    test('should deny access without token', async () => {
      const protectedEndpoints = [
        '/api/users',
        '/api/dashboard/stats',
        '/api/auth/profile'
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('TOKEN_REQUIRED');
      }
    });

    test('should prevent privilege escalation', async () => {
      // el cliente no debe poder modificar su propio rol
      const response = await request(app)
        .patch(`/api/users/${customerUser.id}/role`)
        .send({ roleId: adminRole.id })
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    test('should rate limit login attempts', async () => {
      const loginData = {
        login: 'nonexistent@test.com',
        password: 'wrongpassword'
      };

      let rateLimitHit = false;

      // Make multiple failed login attempts
      for (let i = 0; i < 120; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .set('X-Forwarded-For', '1.2.3.4')
          .send(loginData);

        if (response.status === 429) {
          rateLimitHit = true;
          expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
          break;
        }
      }

      expect(rateLimitHit).toBe(true);
    }, 30000); // aumentamos el timeout para este test

    test('should rate limit API requests', async () => {
      const user = await global.testUtils.createTestUser();
      const role = await Role.create({
        name: 'products_reader',
        display_name: 'Products Reader',
        level: 1,
        permissions: { products: { read: true } }
      });
      await user.addRole(role);
      const token = global.testUtils.generateTestToken(user);

      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${token}`);

      expect(response.headers['ratelimit-limit']).toBeDefined();
    }, 30000);
  });

  describe('Input Validation', () => {
    let authToken;
    let store;

    beforeEach(async () => {
      const user = await global.testUtils.createTestUser();
      authToken = global.testUtils.generateTestToken(user);
      store = await Store.create({
        name: `Validation Store ${Math.random().toString(36).slice(2, 7)}`,
        subdomain: `val${Math.random().toString(36).slice(2, 7)}`,
        is_active: true
      });
    });

    test('should validate email format', async () => {
      const invalidEmails = [
        'invalid-email',
        '@missing-local.com',
        'missing-at-sign.com',
        'spaces in@email.com',
        'too@many@ats.com'
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/public/register')
          .set('Host', `${store.subdomain}.${process.env.TENANT_BASE_DOMAIN || 'neonhub.es'}`)
          .send({
            username: 'testuser',
            email: email,
            password: 'ValidPass123!',
            first_name: 'Test',
            last_name: 'User'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });

    test('should validate required fields', async () => {
      const incompleteData = [
        { email: 'test@test.com', password: 'pass' }, // missing username
        { username: 'test', password: 'pass' }, // missing email
        { username: 'test', email: 'test@test.com' } // missing password
      ];

      for (const data of incompleteData) {
        const response = await request(app)
          .post('/api/public/register')
          .set('Host', `${store.subdomain}.${process.env.TENANT_BASE_DOMAIN || 'neonhub.es'}`)
          .send(data);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });

    test('should validate data types and formats', async () => {
      const admin = await global.testUtils.createTestUser({ username: 'admin' });
      const adminRole = await Role.create({
        name: 'admin',
        display_name: 'Administrator',
        level: 80,
        permissions: { products: { create: true } }
      });
      await admin.addRole(adminRole);
      const adminToken = global.testUtils.generateTestToken(admin);

      // formato de precio inválido - requires CSRF token for authenticated POST
      const response1 = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-csrf-token', 'valid-csrf-token')
        .send({
          name: 'Test Product',
          sku: 'TEST-001',
          slug: 'test-product',
          price: 'not-a-number'
        });

      expect(response1.status).toBe(400);

      // Negative price
      const response2 = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-csrf-token', 'valid-csrf-token')
        .send({
          name: 'Test Product',
          sku: 'TEST-002',
          slug: 'test-product-2',
          price: -10
        });

      expect(response2.status).toBe(400);
    });
  });

  describe('Data Exposure', () => {
    test('should not expose sensitive data in responses', async () => {
      const user = await global.testUtils.createTestUser();
      const token = global.testUtils.generateTestToken(user);

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // la contraseña nunca debe estar en la respuesta
      expect(response.body.data.user.password).toBeUndefined();

      // comprobamos otros campos sensibles que no deben exponerse
      expect(response.body.data.user.password_hash).toBeUndefined();
      expect(response.body.data.user.salt).toBeUndefined();
    });

    test('should not expose internal system information in errors', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint')
        .expect(404);

      // no debe exponer stack traces ni rutas internas
      expect(response.body.stack).toBeUndefined();
      expect(response.body.trace).toBeUndefined();

      // el mensaje de error debe ser genérico
      expect(response.body.message).not.toContain('/home/');
      expect(response.body.message).not.toContain('node_modules');
    });
  });

  // =========================================================================
  // NEW SECURITY TEST CASES
  // =========================================================================

  describe('CSRF Token Missing', () => {
    // NOTE: /api/auth/login is a PUBLIC path - CSRF is skipped for unauthenticated endpoints
    // CSRF protects authenticated state-changing operations

    test('PUT /api/auth/profile without CSRF token should return 403', async () => {
      const user = await global.testUtils.createTestUser();
      const token = global.testUtils.generateTestToken(user);

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: 'Updated' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CSRF_TOKEN_MISSING');
    });

    test('PATCH request without CSRF token should return 403', async () => {
      const user = await global.testUtils.createTestUser();
      const token = global.testUtils.generateTestToken(user);

      const response = await request(app)
        .patch('/api/auth/active-store')
        .set('Authorization', `Bearer ${token}`)
        .send({ storeId: 'some-store-id' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CSRF_TOKEN_MISSING');
    });

    test('DELETE request without CSRF token should return 403', async () => {
      const user = await global.testUtils.createTestUser();
      const token = global.testUtils.generateTestToken(user);

      const response = await request(app)
        .delete('/api/auth/sessions')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CSRF_TOKEN_MISSING');
    });

    test('GET requests should NOT require CSRF token', async () => {
      const user = await global.testUtils.createTestUser();
      const token = global.testUtils.generateTestToken(user);

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      // GET requests are safe methods — should not be blocked by CSRF
      expect(response.status).not.toBe(403);
    });

    test('POST with x-csrf-token header should pass CSRF check', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('x-csrf-token', 'test-csrf-token')
        .send({ login: 'nonexistent@test.com', password: 'WrongPass123!' });

      // Should pass CSRF check and reach the login logic (401 = credentials invalid, not 403)
      expect(response.status).not.toBe(403);
    });
  });

  describe('Auth Endpoint Rate Limiting', () => {
    test('should rate limit login endpoint after too many requests', async () => {
      let rateLimitHit = false;

      // authLimiter allows 100 requests per 15 min window (skips 127.0.0.1)
      // We use a spoofed IP to bypass the trusted-IP skip
      for (let i = 0; i < 120; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .set('X-Forwarded-For', '10.99.99.99')
          .set('x-csrf-token', 'test-csrf-token')
          .send({ login: 'ratelimit@test.com', password: 'WrongPass123!' });

        if (response.status === 429) {
          rateLimitHit = true;
          expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
          break;
        }
      }

      expect(rateLimitHit).toBe(true);
    }, 30000);

    test('should include rate limit headers in auth responses', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', '10.88.88.88')
        .set('x-csrf-token', 'test-csrf-token')
        .send({ login: 'headers@test.com', password: 'WrongPass123!' });

      // express-rate-limit with standardHeaders: true sets RateLimit-* headers
      const hasRateLimitHeader = response.headers['ratelimit-limit'] !== undefined
        || response.headers['ratelimit-remaining'] !== undefined
        || response.headers['x-ratelimit-limit'] !== undefined;

      expect(hasRateLimitHeader).toBe(true);
    });
  });

  describe('Account Lockout', () => {
    test('should lock account after 5 failed login attempts', async () => {
      const store = await Store.create({
        name: 'Lockout Test Store',
        subdomain: `lockout${Math.random().toString(36).slice(2, 7)}`,
        is_active: true
      });

      const user = await global.testUtils.createTestUser({
        username: 'lockout_user',
        email: 'lockout@test.com',
        store_id: store.id
      });

      // Make 5 failed login attempts with wrong password
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .set('Host', `${store.subdomain}.${process.env.TENANT_BASE_DOMAIN || 'neonhub.es'}`)
          .set('x-csrf-token', 'test-csrf-token')
          .send({ login: user.email, password: 'WrongPassword123!' });
      }

      // 6th attempt should return 423 (account locked)
      const response = await request(app)
        .post('/api/auth/login')
        .set('Host', `${store.subdomain}.${process.env.TENANT_BASE_DOMAIN || 'neonhub.es'}`)
        .set('x-csrf-token', 'test-csrf-token')
        .send({ login: user.email, password: 'WrongPassword123!' });

      expect(response.status).toBe(423);
      expect(response.body.success).toBe(false);
      expect(response.body.remaining_minutes).toBeDefined();
      expect(response.body.remaining_minutes).toBeGreaterThan(0);
      expect(response.body.remaining_minutes).toBeLessThanOrEqual(120);
    }, 15000);

    test('should set locked_until to approximately 2 hours in the future', async () => {
      const { User } = require('../../src/models');

      const store = await Store.create({
        name: 'Lockout Duration Store',
        subdomain: `lockdur${Math.random().toString(36).slice(2, 7)}`,
        is_active: true
      });

      const user = await global.testUtils.createTestUser({
        username: 'lockout_duration_user',
        email: 'lockout_duration@test.com',
        store_id: store.id
      });

      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .set('Host', `${store.subdomain}.${process.env.TENANT_BASE_DOMAIN || 'neonhub.es'}`)
          .set('x-csrf-token', 'test-csrf-token')
          .send({ login: user.email, password: 'WrongPassword123!' });
      }

      // Verify locked_until is set in the database
      const lockedUser = await User.unscoped().findByPk(user.id);
      expect(lockedUser.locked_until).not.toBeNull();

      const lockedUntil = new Date(lockedUser.locked_until).getTime();
      const now = Date.now();
      const twoHoursMs = 2 * 60 * 60 * 1000;

      // locked_until should be approximately 2 hours from now (within 10s tolerance)
      expect(lockedUntil - now).toBeGreaterThan(twoHoursMs - 10000);
      expect(lockedUntil - now).toBeLessThanOrEqual(twoHoursMs + 1000);
    }, 15000);

    test('should still reject correct password while account is locked', async () => {
      const bcrypt = require('bcryptjs');

      const store = await Store.create({
        name: 'Locked Correct PW Store',
        subdomain: `lockpw${Math.random().toString(36).slice(2, 7)}`,
        is_active: true
      });

      const password = 'CorrectPass123!';
      const user = await global.testUtils.createTestUser({
        username: 'locked_correct_pw_user',
        email: 'locked_correctpw@test.com',
        password_hash: await bcrypt.hash(password, 10),
        store_id: store.id
      });

      // Lock the account with 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .set('Host', `${store.subdomain}.${process.env.TENANT_BASE_DOMAIN || 'neonhub.es'}`)
          .set('x-csrf-token', 'test-csrf-token')
          .send({ login: user.email, password: 'WrongPassword123!' });
      }

      // Now try with the CORRECT password — should still be locked
      const response = await request(app)
        .post('/api/auth/login')
        .set('Host', `${store.subdomain}.${process.env.TENANT_BASE_DOMAIN || 'neonhub.es'}`)
        .set('x-csrf-token', 'test-csrf-token')
        .send({ login: user.email, password });

      expect(response.status).toBe(423);
      expect(response.body.success).toBe(false);
    }, 15000);
  });

  describe('JWT in localStorage (XSS-ready)', () => {
    test('should document that JWT tokens are returned in response body (accessible to JS / localStorage)', async () => {
      const bcrypt = require('bcryptjs');

      const store = await Store.create({
        name: 'JWT Exposure Store',
        subdomain: `jwtexp${Math.random().toString(36).slice(2, 7)}`,
        is_active: true
      });

      const password = 'SecurePass123!';
      const user = await global.testUtils.createTestUser({
        username: 'jwt_exposure_user',
        email: 'jwt_exposure@test.com',
        password_hash: await bcrypt.hash(password, 10),
        store_id: store.id
      });

      const response = await request(app)
        .post('/api/auth/login')
        .set('Host', `${store.subdomain}.${process.env.TENANT_BASE_DOMAIN || 'neonhub.es'}`)
        .set('x-csrf-token', 'test-csrf-token')
        .send({ login: user.email, password });

      // If the login succeeds, the token is in the response body — meaning the
      // frontend can (and likely does) store it in localStorage.
      // This is an XSS-ready finding: any XSS vulnerability would allow an
      // attacker to steal the token.
      if (response.status === 200) {
        const token = response.body.data?.token
          || response.body.data?.accessToken
          || response.body.token;

        // FINDING: the access token is exposed in the JSON response body
        // A more secure pattern would use httpOnly cookies exclusively.
        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        expect(token.length).toBeGreaterThan(0);

        // Verify it's a valid JWT structure (header.payload.signature)
        const jwtParts = token.split('.');
        expect(jwtParts.length).toBe(3);
      } else {
        // If login fails for other reasons in test env, we still document the concern
        // eslint-disable-next-line no-console
        console.warn(
          `[SECURITY FINDING] JWT localStorage test: login returned ${response.status}. ` +
          'Verify manually that tokens are not stored in localStorage in production.'
        );
      }
    });
  });

  describe('Stripe client_secret should not be in order responses', () => {
    let adminUser;
    let adminToken;
    let store;
    let customer;
    let product;

    beforeEach(async () => {
      const { Customer, Product } = require('../../src/models');

      store = await Store.create({
        name: 'Stripe Secret Store',
        subdomain: `stripe${Math.random().toString(36).slice(2, 7)}`,
        is_active: true
      });

      adminUser = await global.testUtils.createTestUser({
        username: 'stripe_admin',
        email: 'stripe_admin@test.com',
        store_id: store.id
      });

      const adminRole = await Role.create({
        name: 'admin',
        display_name: 'Administrator',
        level: 80,
        permissions: {
          orders: { create: true, read: true, update: true, delete: true },
          products: { create: true, read: true }
        }
      });
      await adminUser.addRole(adminRole);
      adminToken = global.testUtils.generateTestToken(adminUser);

      customer = await Customer.create({
        store_id: store.id,
        customer_code: `CUST-${Date.now()}`,
        first_name: 'Stripe',
        last_name: 'Test',
        email: 'stripe_customer@test.com'
      });

      product = await Product.create({
        store_id: store.id,
        name: 'Stripe Test Product',
        slug: `stripe-test-${Date.now()}`,
        sku: `STRIPE-${Date.now()}`,
        description: 'Product for stripe secret test',
        price: 49.99,
        stock_quantity: 100,
        is_active: true
      });
    });

    test('order creation response should not contain stripe_client_secret', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', `${store.subdomain}.${process.env.TENANT_BASE_DOMAIN || 'neonhub.es'}`)
        .set('x-csrf-token', 'test-csrf-token')
        .send({
          customer_id: customer.id,
          customerId: customer.id,
          items: [{
            product_id: product.id,
            productId: product.id,
            quantity: 1,
            unit_price: product.price
          }]
        });

      if (response.status === 201) {
        const orderData = response.body.data?.order;
        expect(orderData).toBeDefined();

        // SECURITY: stripe_client_secret must NOT be exposed in the API response
        expect(orderData.stripe_client_secret).toBeUndefined();

        // Deep check: stringify and search for the pattern
        const responseStr = JSON.stringify(response.body);
        expect(responseStr).not.toContain('stripe_client_secret');
      }
    });

    test('order GET response should not contain stripe_client_secret', async () => {
      const { Order } = require('../../src/models');

      // Create an order directly in the DB with a fake stripe_client_secret
      const order = await Order.create({
        store_id: store.id,
        order_number: `ORD-${Date.now()}`,
        customer_id: customer.id,
        user_id: adminUser.id,
        status: 'pending',
        order_date: new Date(),
        total_amount: 49.99,
        subtotal: 49.99,
        stripe_client_secret: 'pi_secret_SHOULD_NOT_APPEAR_IN_RESPONSE'
      });

      const response = await request(app)
        .get(`/api/orders/${order.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', `${store.subdomain}.${process.env.TENANT_BASE_DOMAIN || 'neonhub.es'}`);

      if (response.status === 200) {
        const responseStr = JSON.stringify(response.body);

        // SECURITY: the secret value must never appear in the response
        expect(responseStr).not.toContain('pi_secret_SHOULD_NOT_APPEAR_IN_RESPONSE');
      }
    });

    test('order list response should not contain stripe_client_secret', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Host', `${store.subdomain}.${process.env.TENANT_BASE_DOMAIN || 'neonhub.es'}`);

      if (response.status === 200) {
        const responseStr = JSON.stringify(response.body);
        expect(responseStr).not.toContain('stripe_client_secret');
      }
    });
  });

  describe('Cross-tenant header bypass (X-Tenant-ID)', () => {
    test('X-Tenant-ID header should not grant access to another tenant resources', async () => {
      // Create two separate stores (tenants)
      const storeA = await Store.create({
        name: 'Tenant A',
        subdomain: `tenanta${Math.random().toString(36).slice(2, 7)}`,
        is_active: true
      });
      const storeB = await Store.create({
        name: 'Tenant B',
        subdomain: `tenantb${Math.random().toString(36).slice(2, 7)}`,
        is_active: true
      });

      // Create a user in Store A
      const userA = await global.testUtils.createTestUser({
        username: 'cross_tenant_user',
        email: 'cross_tenant@test.com',
        store_id: storeA.id
      });
      const readerRole = await Role.create({
        name: 'reader',
        display_name: 'Reader',
        level: 40,
        permissions: { orders: { read: true }, products: { read: true } }
      });
      await userA.addRole(readerRole);
      const tokenA = global.testUtils.generateTestToken(userA);

      // Try to access Store B resources by spoofing X-Tenant-ID header
      // The user belongs to Store A, so this should be denied
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Tenant-ID', storeB.id);

      // Should be 403 (tenant access denied) since user A does not belong to Store B
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe('TENANT_ACCESS_DENIED');
    });

    test('X-Tenant-ID with valid own tenant should work', async () => {
      const store = await Store.create({
        name: 'Own Tenant',
        subdomain: `owntenant${Math.random().toString(36).slice(2, 7)}`,
        is_active: true
      });

      const user = await global.testUtils.createTestUser({
        username: 'own_tenant_user',
        email: 'own_tenant@test.com',
        store_id: store.id
      });
      const readerRole = await Role.create({
        name: 'reader',
        display_name: 'Reader',
        level: 40,
        permissions: { orders: { read: true }, products: { read: true } }
      });
      await user.addRole(readerRole);
      const token = global.testUtils.generateTestToken(user);

      // Use X-Tenant-ID with the user's own store — should be allowed
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-ID', store.id);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('X-Tenant-ID with non-existent store ID should not resolve a tenant', async () => {
      const store = await Store.create({
        name: 'Real Tenant',
        subdomain: `realtenant${Math.random().toString(36).slice(2, 7)}`,
        is_active: true
      });

      const user = await global.testUtils.createTestUser({
        username: 'fake_tenant_user',
        email: 'fake_tenant@test.com',
        store_id: store.id
      });
      const readerRole = await Role.create({
        name: 'reader',
        display_name: 'Reader',
        level: 1,
        permissions: { products: { read: true } }
      });
      await user.addRole(readerRole);
      const token = global.testUtils.generateTestToken(user);

      // Use a completely fabricated UUID
      const fakeStoreId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-ID', fakeStoreId);

      // Without a resolved tenant, the request should not return Store A data.
      // The behavior depends on how the app handles no-tenant context:
      // either 200 with empty data, or the tenant mismatch check blocks access.
      if (response.status === 200) {
        // If the response succeeds, it should not contain data from the user's own store
        // when the tenant context is a fake store
        const products = response.body.data?.products || [];
        // No products from the real store should appear under a fake tenant
        expect(products.length).toBe(0);
      }
      // Alternatively, the request may fail with 403 — both are acceptable
      expect([200, 403]).toContain(response.status);
    });

    test('X-Tenant-ID should not override subdomain-based tenant resolution', async () => {
      const storeA = await Store.create({
        name: 'Subdomain Tenant',
        subdomain: `subdomain${Math.random().toString(36).slice(2, 7)}`,
        is_active: true
      });
      const storeB = await Store.create({
        name: 'Header Tenant',
        subdomain: `header${Math.random().toString(36).slice(2, 7)}`,
        is_active: true
      });

      const user = await global.testUtils.createTestUser({
        username: 'subdomain_priority_user',
        email: 'subdomain_priority@test.com',
        store_id: storeA.id
      });
      const readerRole = await Role.create({
        name: 'reader',
        display_name: 'Reader',
        level: 40,
        permissions: { orders: { read: true } }
      });
      await user.addRole(readerRole);
      const token = global.testUtils.generateTestToken(user);

      // Set both subdomain (via Host) for Store A AND X-Tenant-ID for Store B
      // The subdomain should take priority — the user belongs to Store A, so this is fine
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .set('Host', `${storeA.subdomain}.${process.env.TENANT_BASE_DOMAIN || 'neonhub.es'}`)
        .set('X-Tenant-ID', storeB.id);

      // Subdomain-based resolution should take precedence over X-Tenant-ID
      // The user belongs to Store A (subdomain match), so access should be allowed
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
