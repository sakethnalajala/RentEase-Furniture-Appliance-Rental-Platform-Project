const mongoose = require('mongoose');
const { VENDOR_STATUS } = require('../constants/inventoryStatus');

const vendorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    businessName: { type: String, required: true, trim: true },
    gstNumber: { type: String, trim: true, default: '' },
    panNumber: { type: String, trim: true, default: '' },
    businessAddress: { type: String, default: '' },
    area: { type: String, default: '' },
    description: { type: String, default: '' },
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
    // Cities the vendor also fulfils orders in, beyond their primary `city` above — additive,
    // doesn't change any existing single-city logic (product.city stays the source of truth
    // for catalog filtering).
    operatingCities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'City' }],
    warehouseLocation: {
      name: { type: String, default: '' },
      address: { type: String, default: '' },
      lat: { type: Number },
      lng: { type: Number },
    },
    profilePhoto: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    logo: { type: String, default: '' },
    status: { type: String, enum: Object.values(VENDOR_STATUS), default: VENDOR_STATUS.PENDING },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: '' },
    commissionOverridePercent: { type: Number, default: null },
    bankDetails: {
      accountHolderName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifsc: { type: String, default: '' },
    },
    documents: [{ type: { type: String }, url: String, uploadedAt: Date }],
    averageRating: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
  },
  { timestamps: true }
);

vendorSchema.index({ status: 1, city: 1 });

module.exports = mongoose.model('Vendor', vendorSchema);
