const mongoose = require('mongoose');

const commissionSettingSchema = new mongoose.Schema(
  {
    scope: { type: String, enum: ['global', 'vendor', 'category'], required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', default: null },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    commissionPercent: { type: Number, required: true, min: 0, max: 100 },
    effectiveFrom: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CommissionSetting', commissionSettingSchema);
