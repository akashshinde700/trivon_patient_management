const express = require('express');
const {
  sendEmailNotification,
  sendWhatsAppNotification,
  sendSMSNotification,
  sendReceiptNotification,
  listNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} = require('../controllers/notificationController');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, listNotifications);
router.patch('/read-all', authenticateToken, markAllNotificationsAsRead);
router.patch('/:id/read', authenticateToken, markNotificationAsRead);
router.post('/email', authenticateToken, sendEmailNotification);
router.post('/whatsapp', authenticateToken, sendWhatsAppNotification);
router.post('/sms', authenticateToken, sendSMSNotification);
router.post('/receipt', authenticateToken, sendReceiptNotification);

module.exports = router;
