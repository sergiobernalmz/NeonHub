const { Store } = require('../models');
const rateLimit = require('express-rate-limit');

const apiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 1000,
  keyGenerator: (req) => req.headers['x-api-key'] || req.headers['x-neonhub-api-key'] || req.ip,
  message: {
    success: false,
    error: 'Rate limit excedido. Máximo 1000 peticiones por hora.',
    retry_after: '1 hora'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authenticateApiKey = async (req, res, next) => {
  const apiKey =
    req.headers['x-api-key'] ||
    req.headers['x-neonhub-api-key'] ||
    req.query.api_key;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key requerida',
      docs: 'https://neonhub.es/docs/api'
    });
  }

  try {
    const store = await Store.findOne({
      where: { api_key_secret: apiKey, is_active: true }
    });

    if (!store) {
      return res.status(401).json({
        success: false,
        error: 'API key inválida o tienda inactiva'
      });
    }

    req.store = store;
    req.storeId = store.id;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Error de autenticación' });
  }
};

module.exports = { authenticateApiKey, apiRateLimiter };
