const express = require('express');
const router = express.Router();
const { reportController } = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

router.get('/', reportController.getReports);

router.get('/stats', reportController.getReportStats);

router.get('/:id', reportController.getReportById);

router.post('/', reportController.createReport);

router.put('/:id', reportController.updateReport);

router.post('/:id/assign', reportController.assignReport);

router.post('/:id/comments', reportController.addComment);

router.delete('/:id', reportController.deleteReport);

module.exports = router;
