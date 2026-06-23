const express = require('express');
const { body, param, query } = require('express-validator');
const orderController = require('../controllers/orderController');
const { authenticateToken, requirePermission, requireRoleLevel } = require('../middleware/auth');
const { auditAction } = require('../middleware/auditMiddleware');

const router = express.Router();

const createOrderValidation = [
  body('customer_id')
    .isUUID()
    .withMessage('El ID del cliente debe ser un UUID válido'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Los artículos deben ser un array con al menos un elemento'),
  body('items.*.product_id')
    .isUUID()
    .withMessage('El ID del producto debe ser un UUID válido'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('La cantidad debe ser un número entero positivo'),
  body('items.*.unit_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El precio unitario debe ser un número positivo'),
  body('items.*.discount_percentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('El porcentaje de descuento debe estar entre 0 y 100'),
  body('items.*.discount_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El monto de descuento debe ser un número positivo'),
  body('items.*.tax_percentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('El porcentaje de impuesto debe estar entre 0 y 100'),
  body('items.*.tax_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El monto de impuesto debe ser un número positivo'),
  body('shipping_address')
    .optional()
    .isObject()
    .withMessage('La dirección de envío debe ser un objeto'),
  body('shipping_address.street')
    .optional()
    .isLength({ min: 5, max: 200 })
    .withMessage('La calle debe tener entre 5 y 200 caracteres'),
  body('shipping_address.city')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('La ciudad debe tener entre 2 y 100 caracteres'),
  body('shipping_address.state')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('El estado debe tener entre 2 y 100 caracteres'),
  body('shipping_address.postal_code')
    .optional()
    .isLength({ min: 3, max: 20 })
    .withMessage('El código postal debe tener entre 3 y 20 caracteres'),
  body('shipping_address.country')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('El país debe tener entre 2 y 100 caracteres'),
  body('billing_address')
    .optional()
    .isObject()
    .withMessage('La dirección de facturación debe ser un objeto'),
  body('shipping_method')
    .optional()
    .isIn(['standard', 'express', 'overnight', 'pickup'])
    .withMessage('El método de envío debe ser: standard, express, overnight o pickup'),
  body('payment_method')
    .optional()
    .isIn(['cash', 'card', 'transfer', 'check', 'credit'])
    .withMessage('El método de pago debe ser: cash, card, transfer, check o credit'),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Las notas no pueden exceder 1000 caracteres'),
  body('discount_percentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('El porcentaje de descuento debe estar entre 0 y 100'),
  body('discount_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El monto de descuento debe ser un número positivo'),
  body('tax_percentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('El porcentaje de impuesto debe estar entre 0 y 100'),
  body('tax_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El monto de impuesto debe ser un número positivo'),
  body('shipping_cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El costo de envío debe ser un número positivo'),
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('La moneda debe tener exactamente 3 caracteres')
    .isAlpha()
    .withMessage('La moneda solo puede contener letras')
];

const updateStatusValidation = [
  param('id')
    .custom((value) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const orderNumberRegex = /^#?ORD-\d+$/;
      
      if (uuidRegex.test(value) || orderNumberRegex.test(value)) {
        return true;
      }
      throw new Error('El ID debe ser un UUID válido o un número de orden válido');
    }),
  body('status')
    .isIn(['draft', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
    .withMessage('El estado debe ser: draft, pending, confirmed, processing, shipped, delivered, cancelled o refunded'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Las notas no pueden exceder 500 caracteres')
];

const idValidation = [
  param('id')
    .isUUID()
    .withMessage('El ID debe ser un UUID válido')
];

const queryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número entero positivo'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe estar entre 1 y 100'),
  query('status')
    .optional()
    .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'completed'])
    .withMessage('El estado debe ser válido'),
  query('payment_status')
    .optional()
    .isIn(['pending', 'paid', 'failed', 'refunded', 'partially_paid'])
    .withMessage('El estado de pago debe ser válido'),
  query('customer_id')
    .optional()
    .isUUID()
    .withMessage('El ID del cliente debe ser un UUID válido'),
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('La fecha de inicio debe ser una fecha válida'),
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('La fecha de fin debe ser una fecha válida'),
  query('min_total')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El total mínimo debe ser un número positivo'),
  query('max_total')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El total máximo debe ser un número positivo'),
  query('sortBy')
    .optional()
    .isIn(['order_number', 'total_amount', 'order_date', 'status', 'created_at'])
    .withMessage('sortBy debe ser: order_number, total_amount, order_date, status o created_at'),
  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('sortOrder debe ser ASC o DESC')
];

const statsQueryValidation = [
  query('period')
    .optional()
    .isIn(['today', 'week', 'month', 'quarter', 'year', 'custom'])
    .withMessage('El período debe ser: today, week, month, quarter, year o custom'),
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('La fecha de inicio debe ser una fecha válida'),
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('La fecha de fin debe ser una fecha válida'),
  query('group_by')
    .optional()
    .isIn(['day', 'week', 'month', 'quarter', 'year'])
    .withMessage('group_by debe ser: day, week, month, quarter o year')
];

router.get('/',
  authenticateToken,
  requireRoleLevel(40),
  queryValidation,
  orderController.getAll
);

router.get('/stats', 
  authenticateToken, 
  requirePermission('orders.read'),
  statsQueryValidation,
  orderController.getStats
);

router.get('/:id', 
  authenticateToken, 
  requirePermission('orders.read'),
  idValidation,
  orderController.getById
);

router.post('/', 
  authenticateToken, 
  requirePermission('orders.create'),
  createOrderValidation,
  orderController.create
);

router.patch('/:id/status',
  authenticateToken,
  requireRoleLevel(40),
  auditAction('order', 'update'),
  updateStatusValidation,
  orderController.updateStatus
);

router.patch('/:id/cancel', 
  authenticateToken, 
  requirePermission('orders.update'),
  idValidation,
  orderController.cancel
);

router.put('/:id',
  authenticateToken,
  requireRoleLevel(80),
  idValidation,
  orderController.update
);

router.delete('/:id',
  authenticateToken,
  requireRoleLevel(80),
  idValidation,
  orderController.delete
);

module.exports = router;