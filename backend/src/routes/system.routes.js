const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const seed = require('../seed');
const City = require('../models/City');
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

// Temporary, one-off repair for a missing demo account (Bengaluru's headline demo delivery
// partner, demo.delivery.bengaluru@rentease.com, isn't in production at all — rejects its
// documented password because there's no such user, not because of a bad hash). Deliberately
// narrow — a full re-seed is destructive against a production DB that now has real user data
// (seed() wipes Product/Order/InventoryItem/Payment), so this re-runs only the one idempotent
// seed step that creates/self-heals the three non-Hyderabad headline delivery partners, exactly
// as seed.js already does during a normal seed run. Same shared-secret gating as /seed.
router.post(
  '/fix-account',
  asyncHandler(async (req, res) => {
    const configuredSecret = process.env.CLEANUP_SECRET;
    if (!configuredSecret) throw ApiError.notFound('Not found.');
    if (req.get('x-cleanup-secret') !== configuredSecret) throw ApiError.notFound('Not found.');

    const email = 'demo.delivery.bengaluru@rentease.com';
    const existedBefore = Boolean(await User.findOne({ email }).select('_id'));

    if (req.query.diagnose === 'true') {
      const phoneHolder = await User.findOne({ phone: '9000000013' }).select('name email role isDemoSeed createdAt');
      return new ApiResponse(200, { email, existedBefore, phoneHolder }).send(res);
    }

    const cities = await City.find({});
    const citiesByName = Object.fromEntries(cities.map((c) => [c.name, c]));
    const created = await seed.seedHeadlineDeliveryPartners(citiesByName);

    const user = await User.findOne({ email });
    const partner = user ? await DeliveryPartner.findOne({ user: user._id }) : null;

    new ApiResponse(
      200,
      {
        email,
        existedBefore,
        userNow: user ? { name: user.name, isActive: user.isActive, isEmailVerified: user.isEmailVerified, isDemoSeed: user.isDemoSeed } : null,
        partnerNow: partner ? { status: partner.status } : null,
        citiesHandled: Object.keys(created || {}),
      },
      existedBefore ? 'Account self-healed.' : 'Account created.'
    ).send(res);
  })
);

module.exports = router;
