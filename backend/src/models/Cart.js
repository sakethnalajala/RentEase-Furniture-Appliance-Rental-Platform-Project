const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', default: null },
    rentalPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'RentalPlan', required: true },
    quantity: { type: Number, default: 1, min: 1 },
    monthlyRentalPrice: { type: Number, required: true },
    securityDeposit: { type: Number, required: true },
  },
  { _id: true }
);

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
    items: [cartItemSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Cart', cartSchema);
