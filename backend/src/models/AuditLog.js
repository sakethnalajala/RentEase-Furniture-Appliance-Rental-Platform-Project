const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    changes: { type: mongoose.Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
