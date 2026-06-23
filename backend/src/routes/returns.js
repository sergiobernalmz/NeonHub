const express = require('express');
const router = express.Router();
const { authenticateToken, requireRoleLevel } = require('../middleware/auth');
const returnController = require('../controllers/returnController');

// CEO routes (minLevel 60) — must come before /:id routes
router.get('/stats', authenticateToken, requireRoleLevel(60), returnController.getReturnStats);
router.get('/', authenticateToken, requireRoleLevel(60), returnController.getStoreReturns);
router.patch('/:id/approve', authenticateToken, requireRoleLevel(60), returnController.approveReturn);
router.patch('/:id/reject', authenticateToken, requireRoleLevel(60), returnController.rejectReturn);

// Customer routes
router.post('/new', authenticateToken, returnController.createReturn);
router.get('/my', authenticateToken, returnController.getMyReturns);

module.exports = router;
