const mongoose = require('mongoose');
const { MAINTENANCE_STATUS } = require('../constants/inventoryStatus');

const maintenanceRequestSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderItem: { type: mongoose.Schema.Types.ObjectId, ref: 'OrderItem', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    description: { type: String, required: true },
    photos: [{ type: String }],
    videos: [{ type: String }],
    status: { type: String, enum: Object.values(MAINTENANCE_STATUS), default: MAINTENANCE_STATUS.SUBMITTED },
    vendorNote: { type: String, default: '' },
    assignedTechnician: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
    },
    isChargeable: { type: Boolean, default: false },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

maintenanceRequestSchema.index({ customer: 1 });
maintenanceRequestSchema.index({ status: 1 });

module.exports = mongoose.model('MaintenanceRequest', maintenanceRequestSchema);
