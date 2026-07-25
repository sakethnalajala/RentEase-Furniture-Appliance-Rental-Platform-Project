const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Address = require('../models/Address');

const listAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.find({ user: req.user._id }).populate('city', 'name state').sort({ isDefault: -1, createdAt: -1 });
  new ApiResponse(200, addresses).send(res);
});

const createAddress = asyncHandler(async (req, res) => {
  const payload = { ...req.body, user: req.user._id };

  if (payload.isDefault) {
    await Address.updateMany({ user: req.user._id }, { $set: { isDefault: false } });
  }

  const existingCount = await Address.countDocuments({ user: req.user._id });
  if (existingCount === 0) payload.isDefault = true; // first address is always the default

  const address = await Address.create(payload);
  new ApiResponse(201, address, 'Address saved.').send(res);
});

const updateAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
  if (!address) throw ApiError.notFound('Address not found.');

  if (req.body.isDefault) {
    await Address.updateMany({ user: req.user._id, _id: { $ne: address._id } }, { $set: { isDefault: false } });
  }

  Object.assign(address, req.body);
  await address.save();
  new ApiResponse(200, address, 'Address updated.').send(res);
});

const deleteAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!address) throw ApiError.notFound('Address not found.');

  if (address.isDefault) {
    const another = await Address.findOne({ user: req.user._id }).sort({ createdAt: -1 });
    if (another) {
      another.isDefault = true;
      await another.save();
    }
  }

  new ApiResponse(200, null, 'Address deleted.').send(res);
});

module.exports = { listAddresses, createAddress, updateAddress, deleteAddress };
