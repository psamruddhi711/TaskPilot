const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} = require('../controllers/notificationController');

router.use(authenticateToken);

// GET /api/notifications - Get current user notifications and unread count
router.get('/', getUserNotifications);

// PATCH /api/notifications/read-all - Mark all as read
router.patch('/read-all', markAllNotificationsAsRead);

// PATCH /api/notifications/:id/read - Mark single as read
router.patch('/:id/read', markNotificationAsRead);

module.exports = router;
