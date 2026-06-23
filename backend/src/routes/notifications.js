const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken, requireRoleLevel } = require('../middleware/auth');

router.get(
  '/',
  authenticateToken,
  notificationController.getNotifications
);

router.get(
  '/unread-count',
  authenticateToken,
  notificationController.getUnreadCount
);

router.patch(
  '/:id/read',
  authenticateToken,
  notificationController.markAsRead
);

router.patch(
  '/mark-all-read',
  authenticateToken,
  notificationController.markAllAsRead
);

router.delete(
  '/:id',
  authenticateToken,
  notificationController.deleteNotification
);

router.post(
  '/',
  authenticateToken,
  requireRoleLevel(60),
  notificationController.createNotification
);

module.exports = router;
