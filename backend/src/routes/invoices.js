const express = require('express');
const router  = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticateToken, requireRoleLevel } = require('../middleware/auth');

router.get('/stats',    authenticateToken, requireRoleLevel(60), invoiceController.stats);
router.get('/',         authenticateToken, requireRoleLevel(60), invoiceController.list);
router.get('/my',       authenticateToken, invoiceController.myInvoices);
router.get('/:id/pdf-customer', authenticateToken, invoiceController.pdfCustomer);
router.get('/:id/preview',      authenticateToken, invoiceController.getPreview);
router.get('/:id/pdf',  authenticateToken, requireRoleLevel(60), invoiceController.pdf);
router.get('/:id',      authenticateToken, requireRoleLevel(60), invoiceController.detail);

module.exports = router;
