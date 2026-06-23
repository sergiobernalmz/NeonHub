const express = require('express');
const { authenticateToken, requireRoleLevel } = require('../middleware/auth');
const { customerController } = require('../controllers/customerController');

const router = express.Router();

router.use(authenticateToken, requireRoleLevel(60));

router.get('/', customerController.list);
router.post('/', customerController.create);
router.get('/:id', customerController.getById);
router.put('/:id', customerController.update);
router.delete('/:id', customerController.remove);
router.patch('/:id/status', customerController.updateStatus);

module.exports = router;
