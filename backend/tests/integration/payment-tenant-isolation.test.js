const request = require('supertest');
const app = require('../../src/app');
const { Store, Customer, Order } = require('../../src/models');

describe('Payment tenant isolation', () => {
  test('rejects create-intent for order from another tenant', async () => {
    const storeA = await Store.create({
      name: 'Pay Store A',
      subdomain: 'paystorea',
      is_active: true,
      api_key_public: 'pk_paystorea_test',
      api_key_secret: 'sk_paystorea_test'
    });

    const storeB = await Store.create({
      name: 'Pay Store B',
      subdomain: 'paystoreb',
      is_active: true,
      api_key_public: 'pk_paystoreb_test',
      api_key_secret: 'sk_paystoreb_test'
    });

    const userA = await global.testUtils.createTestUser({
      username: 'payusera',
      email: 'pay-a@test.com',
      store_id: storeA.id
    });

    const customerB = await Customer.create({
      store_id: storeB.id,
      customer_code: 'CUSTPAYB001',
      first_name: 'Pay',
      last_name: 'CustomerB',
      email: 'customer-b@test.com'
    });

    const orderB = await Order.create({
      store_id: storeB.id,
      order_number: 'ORD-PAY-B-001',
      customer_id: customerB.id,
      status: 'pending',
      subtotal: 10,
      tax_amount: 0,
      discount_amount: 0,
      shipping_amount: 0,
      total_amount: 10
    });

    const tokenA = global.testUtils.generateTestToken(userA);

    const response = await request(app)
      .post('/api/payments/create-intent')
      .set('Host', `paystorea.${process.env.TENANT_BASE_DOMAIN || 'neonhub.es'}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        orderId: orderB.id,
        amount: 10,
        currency: 'eur'
      })
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Order not found');
  });
});
