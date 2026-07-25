const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    identifier: { type: String, required: true, trim: true }, // phone or email
    otpHash: { type: String, required: true },
    purpose: {
      type: String,
      enum: ['phone_login', 'verify_phone', 'delivery_confirmation', 'pickup_confirmation'],
      required: true,
    },
    expiresAt: { type: Date, required: true },
    isUsed: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// TTL index: Mongo auto-deletes the document once expiresAt passes.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ identifier: 1, purpose: 1 });

module.exports = mongoose.model('Otp', otpSchema);
