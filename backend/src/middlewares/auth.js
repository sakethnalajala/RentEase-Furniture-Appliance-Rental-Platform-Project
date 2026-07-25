const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const tokenService = require('../services/tokenService');
const User = require('../models/User');

const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) throw ApiError.unauthorized('Authentication token missing.');

  let payload;
  try {
    payload = tokenService.verifyAccessToken(token);
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired access token.');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw ApiError.unauthorized('Account no longer active.');

  req.user = user;
  next();
});

// Attaches req.user if a valid token is present, but never rejects the request.
const optionalAuthenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();

  try {
    const payload = tokenService.verifyAccessToken(token);
    const user = await User.findById(payload.sub);
    if (user && user.isActive) req.user = user;
  } catch (err) {
    // ignore invalid token for optional auth
  }
  next();
});

module.exports = { authenticate, optionalAuthenticate };
