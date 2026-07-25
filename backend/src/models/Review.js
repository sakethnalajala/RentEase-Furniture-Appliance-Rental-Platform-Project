const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderItem: { type: mongoose.Schema.Types.ObjectId, ref: 'OrderItem', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' },
    images: [{ type: String }],
    vendorReply: { type: String, default: '' },
    isVerifiedRental: { type: Boolean, default: true },
  },
  { timestamps: true }
);

reviewSchema.index({ product: 1 });
reviewSchema.index({ customer: 1, orderItem: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
