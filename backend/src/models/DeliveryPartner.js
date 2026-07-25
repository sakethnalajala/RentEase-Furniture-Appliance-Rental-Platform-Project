const mongoose = require('mongoose');
const { VENDOR_STATUS } = require('../constants/inventoryStatus');

const deliveryPartnerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    vehicleType: { type: String, enum: ['bike', 'van', 'truck'], required: true },
    vehicleNumber: { type: String, required: true, trim: true },
    licenseNumber: { type: String, required: true, trim: true },
    assignedCity: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
    area: { type: String, default: '' },
    // Cumulative km across completed deliveries — demo/simulated (this app has no real GPS
    // tracking), incremented alongside totalDeliveries wherever a delivery is marked complete.
    totalDistanceCovered: { type: Number, default: 0 },
    // Admin approval lifecycle — same 4-state shape as Vendor.status (pending/approved/
    // rejected/suspended), reusing VENDOR_STATUS rather than a duplicate enum since the values
    // mean the same thing here. Defaults to APPROVED: like vendors, a self-registered delivery
    // partner can start working immediately (no manual gate at signup), but an Admin can still
    // move them through the full lifecycle afterward.
    status: { type: String, enum: Object.values(VENDOR_STATUS), default: VENDOR_STATUS.APPROVED },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: '' },
    isAvailable: { type: Boolean, default: true },
    // Distinct from `isAvailable` ("can take a new delivery right now" — e.g. false mid-
    // delivery) — this is connectivity: whether the partner is logged into/active on the app
    // at all. A partner can be online but temporarily unavailable, or fully offline.
    isOnline: { type: Boolean, default: true },
    currentLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    averageRating: { type: Number, default: 0 },
    totalDeliveries: { type: Number, default: 0 },
    documents: [{ type: { type: String }, url: String, uploadedAt: Date }],
    profilePhoto: { type: String, default: '' },
    bankDetails: {
      accountHolderName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifsc: { type: String, default: '' },
    },
    totalEarnings: { type: Number, default: 0 },
  },
  { timestamps: true }
);

deliveryPartnerSchema.index({ assignedCity: 1, isAvailable: 1 });
deliveryPartnerSchema.index({ status: 1, assignedCity: 1 });

module.exports = mongoose.model('DeliveryPartner', deliveryPartnerSchema);
