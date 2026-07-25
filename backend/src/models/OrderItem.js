const mongoose = require('mongoose');
const { ORDER_ITEM_STATUS } = require('../constants/orderStatus');

const orderItemSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', default: null },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    inventoryItem: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', default: null },
    rentalPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'RentalPlan', required: true },

    // Delivery-partner assignment (Phase 4 workflow: vendor confirms -> open request -> a
    // delivery partner in the item's city accepts -> picks up -> delivers with OTP).
    deliveryPartner: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryPartner', default: null },
    // Tracked per-partner so a request one partner declines still surfaces to every other
    // partner in the city, instead of disappearing for everyone.
    rejectedByDeliveryPartners: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryPartner' }],
    deliveryFee: { type: Number, default: 0 },
    pickedUpAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    // Customer's rating of the delivery experience itself (distinct from Review.rating, which
    // rates the product) — auto-generated from a realistic canned pool the moment a delivery
    // completes, same "real record, demo content" honesty pattern as the rest of this pipeline.
    deliveryRating: { type: Number, default: null, min: 1, max: 5 },
    deliveryReviewComment: { type: String, default: '' },
    deliveryReviewDate: { type: Date, default: null },

    quantity: { type: Number, default: 1 },
    monthlyRentalPrice: { type: Number, required: true },
    securityDeposit: { type: Number, required: true },
    deliveryCharge: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0 },

    rentalStartDate: { type: Date, default: null },
    rentalEndDate: { type: Date, default: null },

    deliveryDate: { type: Date, default: null },
    deliverySlot: { type: String, default: '' },
    deliveryOtpHash: { type: String, select: false, default: null },
    installationRequired: { type: Boolean, default: false },
    installationScheduledAt: { type: Date, default: null },

    pickupScheduledAt: { type: Date, default: null },
    pickupOtpHash: { type: String, select: false, default: null },

    status: { type: String, enum: Object.values(ORDER_ITEM_STATUS), default: ORDER_ITEM_STATUS.PENDING },
    statusHistory: [
      {
        status: { type: String, enum: Object.values(ORDER_ITEM_STATUS) },
        changedAt: { type: Date, default: Date.now },
        note: { type: String, default: '' },
      },
    ],
    cancelReason: { type: String, default: '' },
  },
  { timestamps: true }
);

orderItemSchema.index({ order: 1 });
orderItemSchema.index({ vendor: 1, status: 1 });
orderItemSchema.index({ deliveryPartner: 1, status: 1 });
orderItemSchema.index({ status: 1 });

module.exports = mongoose.model('OrderItem', orderItemSchema);
