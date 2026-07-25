const crypto = require('crypto');
const Otp = require('../models/Otp');
const ApiError = require('../utils/ApiError');

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;

const hashOtp = (code) => crypto.createHash('sha256').update(code).digest('hex');

function generateSixDigitCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

async function createOtp(identifier, purpose) {
  // Invalidate any previous unused OTPs for the same identifier/purpose before issuing a new one.
  await Otp.updateMany({ identifier, purpose, isUsed: false }, { $set: { isUsed: true } });

  const code = generateSixDigitCode();
  await Otp.create({
    identifier,
    purpose,
    otpHash: hashOtp(code),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  return code;
}

async function verifyOtp(identifier, purpose, code) {
  const record = await Otp.findOne({ identifier, purpose, isUsed: false }).sort({ createdAt: -1 });

  if (!record) throw ApiError.badRequest('No active OTP found. Please request a new one.');
  if (record.expiresAt < new Date()) throw ApiError.badRequest('OTP has expired. Please request a new one.');
  if (record.attempts >= MAX_ATTEMPTS) throw ApiError.badRequest('Too many incorrect attempts. Please request a new OTP.');

  if (record.otpHash !== hashOtp(code)) {
    record.attempts += 1;
    await record.save();
    throw ApiError.badRequest('Incorrect OTP.');
  }

  record.isUsed = true;
  await record.save();
  return true;
}

module.exports = { createOtp, verifyOtp };
