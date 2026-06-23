const request = require('supertest');
const app = require('../../src/app');

describe('Certifications public tenant context', () => {
  test('requires tenant context for certifications search endpoint', async () => {
    const response = await request(app)
      .get('/api/certifications/search/products')
      .set('Host', 'localhost')
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Tenant context is required');
  });
});
