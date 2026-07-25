const mongoose = require('mongoose');

// A genuine singleton — exactly one document ever exists (see getOrCreate below), matching
// this codebase's "real backend, not localStorage-mock" pattern for the Admin "Settings"
// portal. Values here are read at checkout/registration time wherever this app currently
// hardcodes an equivalent constant (GST %, base delivery fee), so changing them here has a
// real, immediate effect rather than being a decorative form.
const platformSettingsSchema = new mongoose.Schema(
  {
    gstPercent: { type: Number, default: 18, min: 0, max: 100 },
    platformFeePercent: { type: Number, default: 5, min: 0, max: 100 },
    baseDeliveryFee: { type: Number, default: 99, min: 0 },
    freeDeliveryThreshold: { type: Number, default: 2000, min: 0 },
    lateReturnFeePerDay: { type: Number, default: 100, min: 0 },
    cancellationWindowHours: { type: Number, default: 24, min: 0 },
    refundProcessingDays: { type: Number, default: 7, min: 0 },
    supportEmail: { type: String, default: 'support@rentease.com' },
    supportPhone: { type: String, default: '1800-000-0000' },
    cancellationPolicy: {
      type: String,
      default: 'Orders can be cancelled free of charge before the vendor confirms them. Once confirmed, cancellation may attract a fee.',
    },
    refundPolicy: {
      type: String,
      default: 'Refunds are processed to the original payment method within the configured refund processing window.',
    },
    privacyPolicy: { type: String, default: 'RentEase collects only the information required to operate the rental marketplace and never sells user data to third parties.' },
    termsOfService: { type: String, default: 'By using RentEase you agree to rent responsibly, return items in the condition received, and pay all applicable fees on time.' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

platformSettingsSchema.statics.getOrCreate = async function () {
  let doc = await this.findOne({});
  if (!doc) doc = await this.create({});
  return doc;
};

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);
