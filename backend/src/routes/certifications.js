const express = require('express');
const router = express.Router();
const certificationController = require('../controllers/certificationController');
const auth = require('../middleware/auth');

const requireTenantContext = (req, res, next) => {
  if (!req.tenant?.id) {
    return res.status(400).json({
      success: false,
      message: 'Tenant context is required'
    });
  }
  return next();
};

// Rutas públicas (no requieren autenticación)
router.get('/search/products', requireTenantContext, certificationController.searchProductsByCertification);
router.get('/stats', certificationController.getCertificationStats);
// store-products debe ir antes de /:id para que no se interprete como id='store-products'
router.get('/store-products', auth.requireAuth, requireTenantContext, certificationController.getStoreCertifiedProducts);
router.get('/', requireTenantContext, certificationController.getCertifications);
router.get('/:id', requireTenantContext, certificationController.getCertificationById);

// Rutas para certificaciones de productos (públicas para mostrar en tienda)
router.get('/products/:productId', requireTenantContext, certificationController.getProductCertifications);

// Rutas protegidas (requieren autenticación)
router.use(auth.requireAuth);

// Gestión de certificaciones (solo admin y manager)
router.post('/', auth.requireRole(['admin', 'manager']), certificationController.createCertification);
router.put('/:id', auth.requireRole(['admin', 'manager']), certificationController.updateCertification);
router.delete('/:id', auth.requireRole(['admin']), certificationController.deleteCertification);

// Gestión de certificaciones de productos
router.post('/products/:productId/certifications/:certificationId',
  auth.requireRole(['admin', 'manager']),
  certificationController.assignCertificationToProduct
);

router.post('/products/:productId/certifications/:certificationId/verify',
  auth.requireRole(['admin', 'manager']),
  certificationController.verifyProductCertification
);

// Asignación/eliminación simple desde el dashboard
router.post('/products/:productId/assign/:certificationId',
  requireTenantContext,
  certificationController.simpleAssignCertification
);

router.delete('/products/:productId/certifications/:certificationId',
  requireTenantContext,
  certificationController.removeProductCertification
);

// Herramientas de administración
router.get('/admin/expiring', 
  auth.requireRole(['admin', 'manager']), 
  certificationController.getExpiringCertifications
);

router.post('/admin/update-expired', 
  auth.requireRole(['admin']), 
  certificationController.updateExpiredCertifications
);

router.post('/admin/verify-all', 
  auth.requireRole(['admin']), 
  certificationController.verifyAllPendingCertifications
);

router.post('/admin/initialize', 
  auth.requireRole(['admin']), 
  certificationController.initializeBaseCertifications
);

module.exports = router;