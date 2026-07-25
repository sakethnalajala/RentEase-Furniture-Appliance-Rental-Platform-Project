const mongoose = require('mongoose');

const rentalPlanSchema = new mongoose.Schema(
  {
    durationMonths: { type: Number, enum: [1, 3, 6, 12], required: true, unique: true },
    label: { type: String, required: true },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RentalPlan', rentalPlanSchema);
