const express = require('express');
const router = express.Router();
const IngestController = require('../controllers/ingestController');
const storeMiddleware = require('../middleware/storeMiddleware');
const { body } = require('express-validator');

// reglas de validación del producto
const validateProduct = [
    body('sku').notEmpty().withMessage('SKU is required'),
    body('name').notEmpty().withMessage('Product name is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number')
];

// aplicamos el storeMiddleware a todas las rutas
// así cada petición lleva un req.store válido
router.use(storeMiddleware);

// --- Routes ---

router.post('/products', validateProduct, IngestController.ingestProduct);

router.post('/orders', IngestController.ingestOrder);

module.exports = router;
