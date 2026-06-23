const express = require('express');
const { authenticateToken, requireRoleLevel } = require('../middleware/auth');
const { dashboardController } = require('../controllers/dashboardController');

const router = express.Router();

router.use(authenticateToken);
router.use(requireRoleLevel(40));

router.get('/stats', dashboardController.getDashboardStats);

router.get('/sales', dashboardController.getSalesData);

router.get('/categories', dashboardController.getCategoryData);

router.get('/orders/recent', dashboardController.getRecentOrders);

router.get('/sustainability', dashboardController.getSustainabilityMetrics);

router.get('/metrics/daily', dashboardController.getDailyMetrics);

router.get('/report', dashboardController.generateReport);

module.exports = router;