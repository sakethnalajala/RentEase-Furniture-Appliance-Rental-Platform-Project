const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Vendor = require('../models/Vendor');
const { VENDOR_STATUS } = require('../constants/inventoryStatus');

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) throw ApiError.unauthorized('Authentication required.');
  if (!roles.includes(req.user.role)) throw ApiError.forbidden('You do not have permission to perform this action.');
  next();
};

// Gates vendor-role routes until an Admin has approved the vendor profile.
const requireApprovedVendor = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw ApiError.notFound('Vendor profile not found.');
  if (vendor.status !== VENDOR_STATUS.APPROVED) {
    throw ApiError.forbidden(`Vendor account is ${vendor.status}. Awaiting Admin approval.`);
  }
  req.vendor = vendor;
  next();
});

module.exports = { authorize, requireApprovedVendor };
