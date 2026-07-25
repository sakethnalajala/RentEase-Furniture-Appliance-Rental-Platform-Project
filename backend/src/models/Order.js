const mongoose = require('mongoose');
const { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHOD } = require('../constants/orderStatus');

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
    deliveryAddress: {
      contactName: String,
      contactPhone: String,
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      pincode: String,
      lat: Number,
      lng: Number,
    },
    items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrderItem' }],

    totalMonthlyRental: { type: Number, required: true },
    totalSecurityDeposit: { type: Number, required: true },
    totalDeliveryCharge: { type: Number, default: 0 },
    grandTotalDue: { type: Number, required: true },

    status: { type: String, enum: Object.values(ORDER_STATUS), default: ORDER_STATUS.PENDING },
    paymentStatus: { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.PENDING },
    paymentMethod: { type: String, enum: Object.values(PAYMENT_METHOD), default: null },

    placedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

orderSchema.index({ customer: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
