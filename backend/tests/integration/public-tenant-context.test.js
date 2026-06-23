const request = require('supertest');
const app = require('../../src/app');

describe('Public routes tenant context', () => {
  test('requires tenant context for public products', async () => {
    const response = await request(app)
      .get('/api/public/products')
      .set('Host', 'localhost')
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Tenant context is required');
  });
});
