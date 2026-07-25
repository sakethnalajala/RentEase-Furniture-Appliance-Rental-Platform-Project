const mongoose = require('mongoose');
const { PRODUCT_CONDITION } = require('../constants/inventoryStatus');

const productSchema = new mongoose.Schema(
  {
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', default: null },
    isRentEaseOwned: { type: Boolean, default: false },

    name: { type: String, required: true, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    // Free-text product type within a category (e.g. "Sofas", "Refrigerators") — lets Browse
    // filter/tab by type without a formal subcategory model the spec never called for.
    subCategory: { type: String, trim: true, default: '', index: true },
    brand: { type: String, required: true, trim: true },
    model: { type: String, default: '' },
    description: { type: String, default: '' },
    images: [{ type: String }],

    purchaseYear: { type: Number },
    condition: { type: String, enum: Object.values(PRODUCT_CONDITION), default: PRODUCT_CONDITION.GOOD },
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: { type: String, default: 'cm' },
    },
    weight: {
      value: Number,
      unit: { type: String, default: 'kg' },
    },
    warranty: {
      duration: Number,
      unit: { type: String, enum: ['months', 'years'], default: 'months' },
    },
    color: { type: String, default: '' },

    sku: { type: String, required: true, unique: true, trim: true },
    stock: { type: Number, default: 0, min: 0 },

    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
    warehouse: {
      name: { type: String, default: '' },
      address: { type: String, default: '' },
      lat: { type: Number },
      lng: { type: Number },
    },

    monthlyRentalPrice: { type: Number, required: true, min: 0 },
    securityDeposit: { type: Number, required: true, min: 0 },
    minRentalPeriodMonths: { type: Number, default: 1 },
    maxRentalPeriodMonths: { type: Number, default: 12 },
    deliveryCharge: { type: Number, default: 0 },
    estimatedDeliveryDays: { type: Number, default: 3, min: 0 },
    installationRequired: { type: Boolean, default: false },

    availabilityStatus: { type: String, enum: ['active', 'inactive'], default: 'active' },
    isActive: { type: Boolean, default: true },

    averageRating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },

    // Demo-data-friendly fields that power Browse's "Highest Discount" / "Best Selling" sorts
    // and the Today's Deals / Best Sellers collections — genuinely stored & sortable, not
    // computed on the fly, even though the values themselves are seed-generated for now.
    discountPercent: { type: Number, default: 0, min: 0, max: 60 },
    unitsRented: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

productSchema.index({ city: 1, category: 1, isActive: 1 });
productSchema.index({ name: 'text', brand: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);
