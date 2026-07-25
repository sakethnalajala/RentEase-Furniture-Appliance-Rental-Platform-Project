const mongoose = require('mongoose');
const { DAMAGE_STATUS } = require('../constants/inventoryStatus');

const damageReportSchema = new mongoose.Schema(
  {
    orderItem: { type: mongoose.Schema.Types.ObjectId, ref: 'OrderItem', required: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    damageType: {
      type: String,
      enum: ['broken_glass', 'water_damage', 'missing_accessories', 'other'],
      required: true,
    },
    description: { type: String, required: true },
    photos: [{ type: String }],
    status: { type: String, enum: Object.values(DAMAGE_STATUS), default: DAMAGE_STATUS.REPORTED },
    feeAmount: { type: Number, default: 0 },
    determinedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    determinedByRole: { type: String, enum: ['technician', 'admin', null], default: null },
    customerResponse: { type: String, default: '' },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

damageReportSchema.index({ orderItem: 1 });
damageReportSchema.index({ status: 1 });

module.exports = mongoose.model('DamageReport', damageReportSchema);
