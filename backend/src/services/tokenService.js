const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');
const RefreshToken = require('../models/RefreshToken');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const parseExpiryToMs = (expiresIn) => {
  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  if (!match) return 30 * 24 * 60 * 60 * 1000; // default 30d
  const value = Number(match[1]);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return value * multipliers[unit];
};

function generateAccessToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

async function issueRefreshToken(user, meta = {}, rememberMe = false) {
  const jti = crypto.randomUUID();
  const rawToken = jwt.sign({ sub: user._id.toString(), jti }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  });

  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + parseExpiryToMs(env.jwt.refreshExpiresIn)),
    userAgent: meta.userAgent || '',
    ip: meta.ip || '',
    rememberMe,
  });

  return rawToken;
}

async function verifyRefreshToken(rawToken) {
  const payload = jwt.verify(rawToken, env.jwt.refreshSecret); // throws if invalid/expired
  const record = await RefreshToken.findOne({ user: payload.sub, tokenHash: hashToken(rawToken), isRevoked: false });
  return { payload, record };
}

async function revokeRefreshToken(rawToken) {
  await RefreshToken.updateOne({ tokenHash: hashToken(rawToken) }, { $set: { isRevoked: true } });
}

async function revokeAllUserRefreshTokens(userId) {
  await RefreshToken.updateMany({ user: userId, isRevoked: false }, { $set: { isRevoked: true } });
}

async function issueTokenPair(user, meta = {}, rememberMe = false) {
  const accessToken = generateAccessToken(user);
  const refreshToken = await issueRefreshToken(user, meta, rememberMe);
  return { accessToken, refreshToken };
}

module.exports = {
  hashToken,
  generateAccessToken,
  verifyAccessToken,
  issueRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  issueTokenPair,
};
