const INVENTORY_STATUS = Object.freeze({
  AVAILABLE: 'available',
  RESERVED: 'reserved',
  OUT_FOR_RENT: 'out_for_rent',
  UNDER_MAINTENANCE: 'under_maintenance',
});

const PRODUCT_CONDITION = Object.freeze({
  NEW: 'new',
  LIKE_NEW: 'like_new',
  GOOD: 'good',
  FAIR: 'fair',
});

const VENDOR_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
});

const MAINTENANCE_STATUS = Object.freeze({
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  TECHNICIAN_ASSIGNED: 'technician_assigned',
  RESOLVED: 'resolved',
});

const DAMAGE_STATUS = Object.freeze({
  REPORTED: 'reported',
  UNDER_INSPECTION: 'under_inspection',
  CHARGEABLE: 'chargeable',
  WAIVED: 'waived',
  RESOLVED: 'resolved',
});

module.exports = {
  INVENTORY_STATUS,
  PRODUCT_CONDITION,
  VENDOR_STATUS,
  MAINTENANCE_STATUS,
  DAMAGE_STATUS,
};
