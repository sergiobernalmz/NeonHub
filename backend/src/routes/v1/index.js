const express = require('express');
const router = express.Router();
const { authenticateApiKey, apiRateLimiter } = require('../../middleware/apiKeyAuth');

const productsV1 = require('./productsV1');
const ordersV1 = require('./ordersV1');
const customersV1 = require('./customersV1');

router.use(apiRateLimiter);
router.use(authenticateApiKey);

// Info endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    api: 'NeonHub Public API',
    version: '1.0',
    store: { id: req.store.id, name: req.store.name, subdomain: req.store.subdomain },
    endpoints: {
      products:       'GET|POST /api/v1/products',
      product:        'GET|PUT|DELETE /api/v1/products/:id',
      orders:         'GET|POST /api/v1/orders',
      order:          'GET /api/v1/orders/:id',
      order_status:   'PATCH /api/v1/orders/:id/status',
      orders_stats:   'GET /api/v1/orders/stats',
      customers:      'GET /api/v1/customers',
      customer:       'GET /api/v1/customers/:id',
    },
    docs: 'https://neonhub.es/docs/api',
    rate_limit: '1000 peticiones / hora por API key',
  });
});

router.use('/products', productsV1);
router.use('/orders', ordersV1);
router.use('/customers', customersV1);

module.exports = router;
