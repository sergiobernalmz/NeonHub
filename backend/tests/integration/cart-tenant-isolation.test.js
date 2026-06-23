const request = require('supertest');
const app = require('../../src/app');
const { Store, Product } = require('../../src/models');

describe('Cart tenant isolation', () => {
  test('rejects adding product from another tenant store', async () => {
    const storeA = await Store.create({
      name: 'Cart Store A',
      subdomain: 'cartstorea',
      is_active: true,
      api_key_public: 'pk_cartstorea_test',
      api_key_secret: 'sk_cartstorea_test'
    });

    const storeB = await Store.create({
      name: 'Cart Store B',
      subdomain: 'cartstoreb',
      is_active: true,
      api_key_public: 'pk_cartstoreb_test',
      api_key_secret: 'sk_cartstoreb_test'
    });

    const userA = await global.testUtils.createTestUser({
      username: 'cartusera',
      email: 'cart-a@test.com',
      store_id: storeA.id
    });

    const productInStoreB = await Product.create({
      store_id: storeB.id,
      name: 'Tenant B Product',
      slug: 'tenant-b-product',
      sku: 'TENANTB001',
      description: 'Product owned by store B',
      price: 19.99,
      stock_quantity: 10,
      is_active: true
    });

    const tokenA = global.testUtils.generateTestToken(userA);

    const response = await request(app)
      .post('/api/cart/items')
      .set('Host', `cartstorea.${process.env.TENANT_BASE_DOMAIN || 'neonhub.es'}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ product_id: productInStoreB.id, quantity: 1 })
      .expect(404);

    expect(response.body.error).toBe('Product not found');
  });

  test('allows adding product from same tenant store', async () => {
    const storeA = await Store.create({
      name: 'Cart Store A2',
      subdomain: 'cartstorea2',
      is_active: true,
      api_key_public: 'pk_cartstorea2_test',
      api_key_secret: 'sk_cartstorea2_test'
    });

    const userA = await global.testUtils.createTestUser({
      username: 'cartusera2',
      email: 'cart-a2@test.com',
      store_id: storeA.id
    });

    const productInStoreA = await Product.create({
      store_id: storeA.id,
      name: 'Tenant A Product',
      slug: 'tenant-a-product',
      sku: 'TENANTA001',
      description: 'Product owned by store A',
      price: 29.99,
      stock_quantity: 10,
      is_active: true
    });

    const tokenA = global.testUtils.generateTestToken(userA);

    const response = await request(app)
      .post('/api/cart/items')
      .set('Host', `cartstorea2.${process.env.TENANT_BASE_DOMAIN || 'neonhub.es'}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ product_id: productInStoreA.id, quantity: 1 })
      .expect(201);

    expect(response.body.product_id).toBe(productInStoreA.id);
  });
});
