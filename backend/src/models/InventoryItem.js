const mongoose = require('mongoose');
const { INVENTORY_STATUS } = require('../constants/inventoryStatus');

const inventoryItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    serialNumber: { type: String, required: true, unique: true, trim: true },
    qrCodeUrl: { type: String, default: '' },
    barcodeUrl: { type: String, default: '' },
    status: { type: String, enum: Object.values(INVENTORY_STATUS), default: INVENTORY_STATUS.AVAILABLE },
    currentOrderItem: { type: mongoose.Schema.Types.ObjectId, ref: 'OrderItem', default: null },
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
    conditionNotes: { type: String, default: '' },
    purchaseDate: { type: Date },
    lastMaintenanceDate: { type: Date, default: null },
  },
  { timestamps: true }
);

inventoryItemSchema.index({ product: 1, status: 1 });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
