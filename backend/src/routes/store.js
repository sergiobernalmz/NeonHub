const express = require('express');
const router = express.Router();
const { authenticateToken, requireRoleLevel } = require('../middleware/auth');
const { getMyStore, updateMyStore, upload, getMyStoreFeatures, updateMyStoreFeatures } = require('../controllers/storeController');

router.get('/me', authenticateToken, requireRoleLevel(100), getMyStore);
router.patch('/me',
  authenticateToken,
  requireRoleLevel(100),
  upload.fields([
    { name: 'logo',              maxCount: 1 },
    { name: 'favicon',           maxCount: 1 },
    { name: 'dashboard_logo',    maxCount: 1 },
    { name: 'dashboard_favicon', maxCount: 1 }
  ]),
  updateMyStore
);

router.get('/me/features',   authenticateToken, requireRoleLevel(100), getMyStoreFeatures);
router.patch('/me/features', authenticateToken, requireRoleLevel(100), updateMyStoreFeatures);

module.exports = router;
