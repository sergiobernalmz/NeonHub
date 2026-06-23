const express = require('express');
const { body, param, query } = require('express-validator');
const categoryController = require('../controllers/categoryController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ── Shared validation ───────────────────────────────────────────────
const queryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('La página debe ser un entero positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('El límite debe estar entre 1 y 100'),
  query('search').optional().isLength({ min: 1, max: 100 }).withMessage('La búsqueda debe tener entre 1 y 100 caracteres'),
  query('is_active').optional().isBoolean().withMessage('is_active debe ser verdadero o falso')
];

const bodyValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 100 }).withMessage('El nombre no puede superar los 100 caracteres'),
  body('description').optional({ nullable: true }).isLength({ max: 500 }).withMessage('La descripción no puede superar los 500 caracteres'),
  body('color').optional({ nullable: true }).matches(/^#[0-9A-Fa-f]{6}$/).withMessage('El color debe ser un hex válido (#RRGGBB)'),
  body('sort_order').optional().isInt({ min: 0 }).withMessage('sort_order debe ser un entero ≥ 0'),
  body('is_active').optional().isBoolean().withMessage('is_active debe ser booleano')
];

router.get('/', optionalAuth, queryValidation, categoryController.getAll);

router.post('/', authenticateToken, bodyValidation, categoryController.create);

router.put(
  '/:id',
  authenticateToken,
  [param('id').isUUID().withMessage('ID inválido'), ...bodyValidation.map(v => v.optional())],
  categoryController.update
);

router.delete(
  '/:id',
  authenticateToken,
  [param('id').isUUID().withMessage('ID inválido')],
  categoryController.remove
);

module.exports = router;