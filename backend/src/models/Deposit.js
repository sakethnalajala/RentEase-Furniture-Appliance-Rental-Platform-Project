const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema(
  {
    orderItem: { type: mongoose.Schema.Types.ObjectId, ref: 'OrderItem', required: true, unique: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['held', 'refunded', 'partially_refunded', 'forfeited'], default: 'held' },
    refundAmount: { type: Number, default: 0 },
    deductionReason: { type: String, default: '' },
    inspectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    inspectedAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Deposit', depositSchema);
