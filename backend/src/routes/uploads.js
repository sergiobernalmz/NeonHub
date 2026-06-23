const express = require('express');
const uploadController = require('../controllers/uploadController');
const { authenticateToken, requirePermission } = require('../middleware/auth');

const router = express.Router();

router.get('/config', uploadController.getImageConfig);

router.post('/images', 
  authenticateToken,
  requirePermission(['products.create', 'products.update']),
  uploadController.uploadImages,
  uploadController.processImages
);

router.get('/images',
  authenticateToken,
  requirePermission('products.read'),
  uploadController.getImagesList
);

router.get('/images/:storeId/thumbnails/:filename',
  (req, res, next) => {
    req.query.type = 'thumbnail';
    next();
  },
  uploadController.serveImage
);

// ── Rutas legacy (retrocompatibilidad con imágenes existentes) ──
// IMPORTANTE: deben ir ANTES de /:storeId/:filename para evitar conflictos

router.get('/images/thumbnails/:filename',
  (req, res, next) => {
    req.query.type = 'thumbnail';
    next();
  },
  uploadController.serveImageLegacy
);

router.get('/images/:storeId/:filename',
  uploadController.serveImage
);

router.get('/images/:filename',
  uploadController.serveImageLegacy
);

router.delete('/images/:filename',
  authenticateToken,
  requirePermission('products.delete'),
  uploadController.deleteImage
);

module.exports = router;