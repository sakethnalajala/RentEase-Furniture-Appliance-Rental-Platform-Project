const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Notification = require('../models/Notification');

const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100).lean();
  new ApiResponse(200, notifications).send(res);
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ user: req.user._id, isRead: false });
  new ApiResponse(200, { count }).send(res);
});

const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { $set: { isRead: true } },
    { new: true }
  );
  if (!notification) throw ApiError.notFound('Notification not found.');
  new ApiResponse(200, notification).send(res);
});

const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { $set: { isRead: true } });
  new ApiResponse(200, null, 'All notifications marked as read.').send(res);
});

const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!notification) throw ApiError.notFound('Notification not found.');
  new ApiResponse(200, null, 'Notification deleted.').send(res);
});

module.exports = { listNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification };
