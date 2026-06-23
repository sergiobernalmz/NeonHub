const request = require('supertest');
const app = require('../../src/app');
const { User, Store } = require('../../src/models');

describe('Tenant isolation middleware', () => {
  test('denies access when user store and tenant subdomain mismatch', async () => {
    const storeA = await Store.create({
      name: 'Store A',
      subdomain: 'storea',
      is_active: true,
      api_key_public: 'pk_storea_test',
      api_key_secret: 'sk_storea_test'
    });
    const storeB = await Store.create({
      name: 'Store B',
      subdomain: 'storeb',
      is_active: true,
      api_key_public: 'pk_storeb_test',
      api_key_secret: 'sk_storeb_test'
    });

    const userA = await global.testUtils.createTestUser({
      username: 'tenantusera',
      email: 'tenant-a@test.com',
      store_id: storeA.id
    });

    const tokenA = global.testUtils.generateTestToken(userA);

    const response = await request(app)
      .get('/api/users/profile')
      .set('Host', `storeb.${process.env.TENANT_BASE_DOMAIN || 'neonhub.es'}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(response.body.error?.code).toBe('TENANT_ACCESS_DENIED');
  });

  test('allows access when user store matches tenant subdomain', async () => {
    const storeA = await Store.create({
      name: 'Store A',
      subdomain: 'storea2',
      is_active: true,
      api_key_public: 'pk_storea2_test',
      api_key_secret: 'sk_storea2_test'
    });

    const userA = await global.testUtils.createTestUser({
      username: 'tenantusera2',
      email: 'tenant-a2@test.com',
      store_id: storeA.id
    });

    const tokenA = global.testUtils.generateTestToken(userA);

    const response = await request(app)
      .get('/api/users/profile')
      .set('Host', `storea2.${process.env.TENANT_BASE_DOMAIN || 'neonhub.es'}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe(userA.id);
  });
});
