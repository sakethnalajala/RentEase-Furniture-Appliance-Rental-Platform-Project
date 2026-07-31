const mongoose = require('mongoose');

// Vendor Rental Requests (frontend/lib/mockVendorData.js's buildRentalRequests) are demo data —
// 220 requests synthesized client-side from the vendor's real catalog, since there's no real
// "customer requests a rental before ordering" flow anywhere in this app (real checkout goes
// straight to a paid Order with no vendor approval step — see order.controller.js). Each
// synthesized request does have a stable, deterministic `id` per vendor (REQ-2026-XXXX, tied to
// its position in the vendor's own product list), which is what this model keys against: a real,
// persisted Approve/Decline decision per (vendor, requestId) pair, overlaid onto the mock list
// by the frontend so a decision survives a refresh even though the request itself isn't a real
// stored entity.
const rentalRequestDecisionSchema = new mongoose.Schema(
  {
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    requestId: { type: String, required: true },
    status: { type: String, enum: ['approved', 'declined'], required: true },
  },
  { timestamps: true }
);

// One decision per (vendor, requestId), ever — the same compound uniqueness a duplicate-action
// guard needs, enforced at the database level, not just in application code.
rentalRequestDecisionSchema.index({ vendor: 1, requestId: 1 }, { unique: true });

module.exports = mongoose.model('RentalRequestDecision', rentalRequestDecisionSchema);
