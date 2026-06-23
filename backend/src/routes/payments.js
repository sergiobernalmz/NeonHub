const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.post('/create-intent', requireAuth, paymentController.createPaymentIntent);

// el webhook necesita raw body, configurado en app.js
router.post('/webhook', paymentController.handleWebhook);

router.post('/refund/:orderId', requireAuth, requireAdmin, paymentController.refundOrder);

module.exports = router;
