const request = require('supertest');
const app = require('../../src/app');

/**
 * Tests de regresión para los tres bugs de verificación corregidos:
 * 1. Los usuarios creados por admin se quedaban con email_verified: false (no podían hacer login)
 * 2. Los usuarios de registro público deben verificar el email antes de hacer login
 * 3. El soft-delete no limpiaba user_roles (el CASCADE no se lanzaba con modo paranoid)
 */
describe('Verification Regression Tests', () => {
  let adminUser, adminToken, adminRole, sharedStore;

  beforeEach(async () => {
    const { Role } = global.testUtils.getModels();

    // creamos una tienda compartida entre el admin y los sujetos de prueba
    sharedStore = await global.testUtils.createTestStore();

    // rol admin: nivel 90 cumple requireAdmin (>= 80) y requireUserCreatePermission
    adminRole = await Role.create({
      name: 'admin',
      display_name: 'Administrator',
      description: 'Admin role for regression tests',
      level: 90,
      permissions: { users: { create: true, read: true, update: true, delete: true } },
      is_active: true
    });

    adminUser = await global.testUtils.createTestUser({
      username: 'regression_admin',
      email: 'regression_admin@test.com',
      store_id: sharedStore.id
    });
    await adminUser.addRole(adminRole);

    adminToken = global.testUtils.generateTestToken(adminUser);
  });

  // -------------------------------------------------------------------------
  // Bug 1: los usuarios creados por un admin pueden hacer login de inmediato (email_verified: true)
  // -------------------------------------------------------------------------
  describe('Bug 1 — Admin-created user login', () => {
    test('user created via POST /api/users has email_verified: true', async () => {
      const { User } = global.testUtils.getModels();

      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'admin_created_user',
          email: 'admincreated@test.com',
          password: 'SecurePass123!',
          firstName: 'Admin',
          lastName: 'Created'
        })
        .expect(201);

      const createdUser = await User.findOne({ where: { username: 'admin_created_user' } });
      expect(createdUser).toBeTruthy();
      expect(createdUser.email_verified).toBe(true);
    });

    test('admin-created user can login immediately without email verification', async () => {
      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'admin_login_test',
          email: 'adminlogintest@test.com',
          password: 'SecurePass123!',
          firstName: 'Admin',
          lastName: 'Login'
        })
        .expect(201);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ login: 'admin_login_test', password: 'SecurePass123!' });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.accessToken).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Bug 1 (contrario): Registro público requiere verificación antes de login
  // -------------------------------------------------------------------------
  describe('Bug 1 — Public register requires verification', () => {
    test('publicly registered user cannot login before verifying email', async () => {
      const store = await global.testUtils.createTestStore();
      const host = `${store.subdomain}.${process.env.TENANT_BASE_DOMAIN || 'neonhub.es'}`;

      await request(app)
        .post('/api/public/register')
        .set('Host', host)
        .send({
          username: 'public_unverified',
          email: 'publicunverified@test.com',
          password: 'SecurePass123!',
          first_name: 'Public',
          last_name: 'User'
        })
        .expect(201);

      // comprobamos el estado en la BD
      const { User } = global.testUtils.getModels();
      const user = await User.findOne({ where: { username: 'public_unverified' } });
      expect(user).toBeTruthy();
      expect(user.email_verified).toBe(false);
      expect(user.verification_token).toBeTruthy();

      // el login debe ser rechazado
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .set('Host', host)
        .send({ login: 'public_unverified', password: 'SecurePass123!' });

      expect(loginResponse.status).toBe(403);
      expect(loginResponse.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    });

    test('publicly registered user can login after verifying email token', async () => {
      const store = await global.testUtils.createTestStore();
      const host = `${store.subdomain}.${process.env.TENANT_BASE_DOMAIN || 'neonhub.es'}`;

      await request(app)
        .post('/api/public/register')
        .set('Host', host)
        .send({
          username: 'public_verified',
          email: 'publicverified@test.com',
          password: 'SecurePass123!',
          first_name: 'Public',
          last_name: 'Verified'
        })
        .expect(201);

      // sacamos el token directamente de la BD (simula hacer clic en el enlace del email)
      const { User } = global.testUtils.getModels();
      const user = await User.findOne({ where: { username: 'public_verified' } });
      const token = user.verification_token;

      await request(app)
        .post('/api/auth/verify-email')
        .send({ token })
        .expect(200);

      // ahora el login debe funcionar
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .set('Host', host)
        .send({ login: 'public_verified', password: 'SecurePass123!' });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Bug 2: Soft-delete limpia user_roles y libera el email para re-registro
  // -------------------------------------------------------------------------
  describe('Bug 2 — Soft-delete cleans up user_roles', () => {
    test('deleting a user removes all their user_roles entries', async () => {
      const { UserRole } = global.testUtils.getModels();

      const targetUser = await global.testUtils.createTestUser({
        username: 'user_to_delete',
        email: 'delete_me@test.com',
        store_id: sharedStore.id
      });
      await targetUser.addRole(adminRole);

      const rolesBefore = await UserRole.findAll({ where: { user_id: targetUser.id } });
      expect(rolesBefore.length).toBeGreaterThan(0);

      await request(app)
        .delete(`/api/users/${targetUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const rolesAfter = await UserRole.findAll({ where: { user_id: targetUser.id } });
      expect(rolesAfter).toHaveLength(0);
    });

    test('email of a deleted user can be reused for a new registration', async () => {
      const { User } = global.testUtils.getModels();
      const reusableEmail = 'reuse_me@test.com';

      const targetUser = await global.testUtils.createTestUser({
        username: 'user_before_delete',
        email: reusableEmail,
        store_id: sharedStore.id
      });

      await request(app)
        .delete(`/api/users/${targetUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // creamos un nuevo usuario con el mismo email — no debe lanzar error
      const newUser = await global.testUtils.createTestUser({
        username: 'user_after_delete',
        email: reusableEmail,
        store_id: sharedStore.id
      });

      expect(newUser).toBeTruthy();
      expect(newUser.email).toBe(reusableEmail);
    });

    test('deleted user cannot authenticate with a previously valid token', async () => {
      const targetUser = await global.testUtils.createTestUser({
        username: 'user_token_after_delete',
        email: 'tokendelete@test.com',
        store_id: sharedStore.id
      });
      const targetToken = global.testUtils.generateTestToken(targetUser);

      await request(app)
        .delete(`/api/users/${targetUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // el token antiguo debe ser rechazado (findByPk devuelve null para soft-deleted en modo paranoid)
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${targetToken}`);

      expect(profileResponse.status).toBe(401);
    });
  });
});