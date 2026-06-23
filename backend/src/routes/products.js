const express = require('express');
const { body, param, query } = require('express-validator');
const productController = require('../controllers/productController');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { auditAction } = require('../middleware/auditMiddleware');

const router = express.Router();

const createProductValidation = [
  body('name')
    .isLength({ min: 2, max: 200 })
    .withMessage('El nombre debe tener entre 2 y 200 caracteres')
    .trim(),
  body('sku')
    .isLength({ min: 2, max: 50 })
    .withMessage('El SKU debe tener entre 2 y 50 caracteres')
    .matches(/^[A-Z0-9-_]+$/)
    .withMessage('El SKU solo puede contener letras mayúsculas, números, guiones y guiones bajos')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('La descripción no puede exceder 5000 caracteres'),
  body('short_description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La descripción corta no puede exceder 500 caracteres'),
  body('category_id')
    .optional({ nullable: true, checkFalsy: true })
    .isUUID()
    .withMessage('El ID de categoría debe ser un UUID válido'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('El precio debe ser un número positivo'),
  body('cost_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El precio de costo debe ser un número positivo'),
  body('compare_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El precio de comparación debe ser un número positivo'),
  body('currency')
    .optional({ checkFalsy: true })
    .isLength({ min: 3, max: 3 })
    .withMessage('La moneda debe tener exactamente 3 caracteres')
    .isAlpha()
    .withMessage('La moneda solo puede contener letras'),
  body('stock_quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('La cantidad en stock debe ser un número entero positivo'),
  body('min_stock_level')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El nivel mínimo de stock debe ser un número entero positivo'),
  body('max_stock_level')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El nivel máximo de stock debe ser un número entero positivo'),
  body('track_inventory')
    .optional()
    .isBoolean()
    .withMessage('El seguimiento de inventario debe ser verdadero o falso'),
  body('allow_backorder')
    .optional()
    .isBoolean()
    .withMessage('Permitir pedidos pendientes debe ser verdadero o falso'),
  body('weight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El peso debe ser un número positivo'),
  body('dimensions')
    .optional()
    .isObject()
    .withMessage('Las dimensiones deben ser un objeto'),
  body('images')
    .optional()
    .isArray()
    .withMessage('Las imágenes deben ser un array'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Las etiquetas deben ser un array'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('El estado activo debe ser verdadero o falso'),
  body('is_featured')
    .optional()
    .isBoolean()
    .withMessage('El estado destacado debe ser verdadero o falso'),
  body('carbon_footprint')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true;
      }
      if (isNaN(value) || parseFloat(value) < 0) {
        throw new Error('La huella de carbono debe ser un número positivo');
      }
      return true;
    }),
  body('sustainability_score')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true;
      }
      const score = parseInt(value);
      if (isNaN(score) || score < 0 || score > 100) {
        throw new Error('La puntuación de sostenibilidad debe estar entre 0 y 100');
      }
      return true;
    }),
  body('eco_friendly')
    .optional()
    .isBoolean()
    .withMessage('Eco-amigable debe ser verdadero o falso'),
  body('recyclable')
    .optional()
    .isBoolean()
    .withMessage('Reciclable debe ser verdadero o falso')
];

const updateProductValidation = [
  param('id')
    .isUUID()
    .withMessage('El ID debe ser un UUID válido'),
  ...createProductValidation.map(validation => {

    if (validation.builder.fields[0] !== 'id') {
      return validation.optional();
    }
    return validation;
  })
];

const idValidation = [
  param('id')
    .isUUID()
    .withMessage('El ID debe ser un UUID válido')
];

const skuValidation = [
  param('sku')
    .isLength({ min: 2, max: 50 })
    .withMessage('El SKU debe tener entre 2 y 50 caracteres')
    .matches(/^[A-Z0-9-_]+$/)
    .withMessage('El SKU solo puede contener letras mayúsculas, números, guiones y guiones bajos')
];

const stockUpdateValidation = [
  param('id')
    .isUUID()
    .withMessage('El ID debe ser un UUID válido'),
  body('quantity')
    .isInt({ min: 0 })
    .withMessage('La cantidad debe ser un número entero positivo'),
  body('operation')
    .optional()
    .isIn(['set', 'add', 'subtract'])
    .withMessage('La operación debe ser: set, add o subtract')
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
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El precio mínimo debe ser un número positivo'),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El precio máximo debe ser un número positivo'),
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive debe ser verdadero o falso'),
  query('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured debe ser verdadero o falso'),
  query('ecoFriendly')
    .optional()
    .isBoolean()
    .withMessage('ecoFriendly debe ser verdadero o falso'),
  query('sortBy')
    .optional()
    .isIn(['name', 'price', 'stock_quantity', 'created_at', 'updated_at'])
    .withMessage('sortBy debe ser: name, price, stock_quantity, created_at o updated_at'),
  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('sortOrder debe ser ASC o DESC')
];

// Routes

router.get('/', 
  authenticateToken, 
  requirePermission('products.read'),
  queryValidation,
  productController.getAll
);

router.get('/low-stock', 
  authenticateToken, 
  requirePermission('products.read'),
  productController.getLowStock
);

router.get('/:id', 
  authenticateToken, 
  requirePermission('products.read'),
  idValidation,
  productController.getById
);

router.get('/sku/:sku', 
  authenticateToken, 
  requirePermission('products.read'),
  skuValidation,
  productController.getBySku
);

router.post('/',
  authenticateToken,
  requirePermission('products.create'),
  auditAction('product', 'create'),
  createProductValidation,
  productController.create
);

router.put('/:id',
  authenticateToken,
  requirePermission('products.update'),
  auditAction('product', 'update'),
  updateProductValidation,
  productController.update
);

router.patch('/:id/stock', 
  authenticateToken, 
  requirePermission('products.update'),
  stockUpdateValidation,
  productController.updateStock
);

router.delete('/:id',
  authenticateToken,
  requirePermission('products.delete'),
  auditAction('product', 'delete'),
  idValidation,
  productController.delete
);

module.exports = router;