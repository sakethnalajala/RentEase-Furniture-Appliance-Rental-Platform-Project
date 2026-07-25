const mongoose = require('mongoose');
const { PAYMENT_STATUS, PAYMENT_METHOD } = require('../constants/orderStatus');

const paymentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    orderItem: { type: mongoose.Schema.Types.ObjectId, ref: 'OrderItem', default: null },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    method: { type: String, enum: Object.values(PAYMENT_METHOD), required: true },
    status: { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.PENDING },
    type: { type: String, enum: ['rental', 'deposit', 'damage_fee', 'extension', 'refund'], required: true },

    razorpayOrderId: { type: String, default: '' },
    razorpayPaymentId: { type: String, default: '' },
    razorpaySignature: { type: String, default: '' },
    failureReason: { type: String, default: '' },
  },
  { timestamps: true }
);

paymentSchema.index({ order: 1 });
paymentSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
