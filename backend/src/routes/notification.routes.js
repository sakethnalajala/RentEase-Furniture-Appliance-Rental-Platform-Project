const express = require('express');
const { authenticate } = require('../middlewares/auth');
const ctrl = require('../controllers/notification.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', ctrl.listNotifications);
router.get('/unread-count', ctrl.getUnreadCount);
router.patch('/read-all', ctrl.markAllAsRead);
router.patch('/:id/read', ctrl.markAsRead);
router.delete('/:id', ctrl.deleteNotification);

module.exports = router;
