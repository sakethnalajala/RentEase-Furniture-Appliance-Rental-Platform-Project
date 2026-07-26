const bcrypt = require('bcryptjs');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const User = require('../models/User');
const City = require('../models/City');
const tokenService = require('../services/tokenService');
const { buildFileUrl } = require('../utils/fileUrl');
const { REFRESH_COOKIE_NAME, refreshCookieOptions } = require('../controllers/auth.controller');

const toSafeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  avatar: user.avatar,
  coverImage: user.coverImage,
  isEmailVerified: user.isEmailVerified,
  twoFactorEnabled: user.twoFactor?.enabled || false,
  selectedCity: user.selectedCity,
  kyc: user.kyc,
  createdAt: user.createdAt,
  lastLoginAt: user.lastLoginAt,
});

const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('selectedCity', 'name state');
  new ApiResponse(200, toSafeUser(user)).send(res);
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, avatar } = req.body;

  if (phone) {
    const existing = await User.findOne({ phone, _id: { $ne: req.user._id } });
    if (existing) throw ApiError.conflict('This phone number is already in use.');
  }

  const user = await User.findById(req.user._id);
  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (avatar !== undefined) user.avatar = avatar;
  await user.save();

  new ApiResponse(200, toSafeUser(user), 'Profile updated.').send(res);
});

const IMAGE_FIELDS = ['avatar', 'coverImage'];

// One endpoint for both of the base User's own image slots (?type=avatar|coverImage) — same
// shape as vendor.controller.js's uploadImage, reused here for the Admin Profile hero's cover
// image and avatar upload buttons.
const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded.');
  const type = req.query.type;
  if (!IMAGE_FIELDS.includes(type)) throw ApiError.badRequest(`type must be one of: ${IMAGE_FIELDS.join(', ')}.`);

  const user = await User.findById(req.user._id);
  user[type] = buildFileUrl(req, req.file);
  await user.save();

  new ApiResponse(200, toSafeUser(user), 'Image updated.').send(res);
});

const selectCity = asyncHandler(async (req, res) => {
  const { cityId } = req.body;
  const city = await City.findOne({ _id: cityId, isActive: true });
  if (!city) throw ApiError.notFound('City not found or not currently supported.');

  const user = await User.findById(req.user._id);
  user.selectedCity = city._id;
  await user.save();

  new ApiResponse(200, { selectedCity: { id: city._id, name: city.name, state: city.state } }, 'City updated.').send(res);
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!user.passwordHash) {
    throw ApiError.badRequest('This account signs in with Google and has no password to change.');
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) throw ApiError.unauthorized('Current password is incorrect.');

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();

  // Force re-login everywhere except the session that just made this change.
  await tokenService.revokeAllUserRefreshTokens(user._id);
  const { accessToken, refreshToken } = await tokenService.issueTokenPair(user);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());

  new ApiResponse(200, { accessToken }, 'Password changed successfully.').send(res);
});

const deactivateAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.isActive = false;
  await user.save();

  await tokenService.revokeAllUserRefreshTokens(user._id);
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });

  new ApiResponse(200, null, 'Account deactivated.').send(res);
});

module.exports = { getMe, updateProfile, uploadImage, selectCity, changePassword, deactivateAccount };
