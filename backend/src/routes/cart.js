const express = require('express');
const { body, param } = require('express-validator');
const cartController = require('../controllers/cartController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, cartController.getCart);

router.post('/items',
  authenticateToken,
  body('product_id').isUUID().withMessage('product_id must be a UUID'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('quantity must be >= 1'),
  cartController.addItem
);

router.put('/items/:id',
  authenticateToken,
  param('id').isUUID().withMessage('id must be a UUID'),
  body('quantity').isInt({ min: 1 }).withMessage('quantity must be >= 1'),
  cartController.updateItem
);

router.delete('/items/:id', authenticateToken, cartController.removeItem);
router.delete('/clear', authenticateToken, cartController.clearCart);
router.post('/checkout', authenticateToken, cartController.checkout);

module.exports = router;
