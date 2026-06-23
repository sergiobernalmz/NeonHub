const express = require('express');
const { authenticateToken, requireRoleLevel } = require('../middleware/auth');
const { sustainabilityController } = require('../controllers/sustainabilityController');

const router = express.Router();

// todas las rutas de sostenibilidad requieren nivel admin 60 o superior
router.use(authenticateToken);
router.use(requireRoleLevel(60));

router.get('/dashboard', sustainabilityController.getDashboardStats);

router.get('/carbon-footprint', sustainabilityController.getCarbonFootprintByProduct);

router.get('/suppliers', sustainabilityController.getSupplierMetrics);

router.get('/monthly-comparison', sustainabilityController.getMonthlyComparison);

router.post('/metrics', sustainabilityController.recordMetric);

router.post('/real-time/update', sustainabilityController.forceRealTimeUpdate);

router.get('/system/status', sustainabilityController.getSystemStatus);

router.post('/system/scheduler', sustainabilityController.toggleScheduler);

router.get('/system/config', sustainabilityController.getApiConfiguration);

module.exports = router;