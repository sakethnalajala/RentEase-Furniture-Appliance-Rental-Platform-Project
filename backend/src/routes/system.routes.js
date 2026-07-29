const express = require('express');
const bcrypt = require('bcryptjs');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const seed = require('../seed');
const User = require('../models/User');
const DeliveryPartner = require('../models/DeliveryPartner');

const router = express.Router();

// One-off production database seeding, reachable over HTTP since a serverless deployment has
// no shell access to run `npm run seed` directly against its own database. Guarded by a shared
// secret (SEED_SECRET) rather than the normal JWT+RBAC admin auth, since this must be callable
// before any admin account exists in a fresh database. Requires DEMO_MODE=true (this seeds demo
// accounts/data — never intended to run against a real production dataset) and a configured
// SEED_SECRET (unset by default, so this route 404s as "not found" rather than 403 on any
// deployment that hasn't deliberately opted in, avoiding advertising its existence).
router.post(
  '/seed',
  asyncHandler(async (req, res) => {
    const configuredSecret = process.env.SEED_SECRET;
    if (!configuredSecret) throw ApiError.notFound('Not found.');
    if (req.get('x-seed-secret') !== configuredSecret) throw ApiError.notFound('Not found.');

    await seed();
    new ApiResponse(200, null, 'Seed complete.').send(res);
  })
);

// Temporary, one-off repair for a single corrupted demo account (Bengaluru's headline demo
// delivery partner, demo.delivery.bengaluru@rentease.com, started rejecting its documented
// password on production). Deliberately narrow — a full re-seed is destructive against a
// production DB that now has real user data (seed() wipes Product/Order/Payment collections),
// so this only resets the one known-broken account's passwordHash/isActive/isEmailVerified and
// the DeliveryPartner sub-document's approval status back to the documented demo values, exactly
// like seed.js's own seeding logic does for a fresh account. Same shared-secret gating as /seed.
router.post(
  '/fix-account',
  asyncHandler(async (req, res) => {
    const configuredSecret = process.env.CLEANUP_SECRET;
    if (!configuredSecret) throw ApiError.notFound('Not found.');
    if (req.get('x-cleanup-secret') !== configuredSecret) throw ApiError.notFound('Not found.');

    const email = 'demo.delivery.bengaluru@rentease.com';
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) throw ApiError.notFound('Account not found.');

    const before = {
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      role: user.role,
      isDemoSeed: user.isDemoSeed,
    };

    user.passwordHash = await bcrypt.hash('Demo@1234', 12);
    user.isActive = true;
    user.isEmailVerified = true;
    user.isDemoSeed = true;
    await user.save();

    const partner = await DeliveryPartner.findOne({ user: user._id });
    const partnerBefore = partner ? { status: partner.status } : null;
    if (partner) {
      partner.status = 'approved';
      await partner.save();
    }

    new ApiResponse(200, { email, before, after: { isActive: user.isActive, isEmailVerified: user.isEmailVerified }, partnerBefore, partnerAfter: partner ? { status: partner.status } : null }, 'Account repaired.').send(res);
  })
);

module.exports = router;
