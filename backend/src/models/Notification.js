const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['order', 'payment', 'maintenance', 'delivery', 'system', 'promotion'],
      default: 'system',
    },
    channels: [{ type: String, enum: ['email', 'sms', 'whatsapp', 'push', 'in_app'] }],
    isRead: { type: Boolean, default: false },
    relatedEntity: {
      type: { type: String, default: '' },
      id: { type: mongoose.Schema.Types.ObjectId, default: null },
    },
    // Free-form structured context (customerName, productName, orderNumber, status, ...) so
    // richer notification types (e.g. a vendor's "new order" card) can render details beyond
    // a plain title/message without a schema migration per notification type.
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
