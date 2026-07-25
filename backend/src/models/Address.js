const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    label: { type: String, default: 'Home' },
    contactName: { type: String, required: true },
    contactPhone: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String, default: '' },
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    lat: { type: Number },
    lng: { type: Number },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

addressSchema.index({ user: 1 });

module.exports = mongoose.model('Address', addressSchema);
