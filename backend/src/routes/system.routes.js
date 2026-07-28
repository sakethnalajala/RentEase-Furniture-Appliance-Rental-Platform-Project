const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const seed = require('../seed');
const { fixDeliveryPartnerGender } = require('../scripts/fixDeliveryPartnerGender');

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

// One-off in-place rename of already-seeded delivery-partner demo profiles that read as
// female to fresh male names — same reachable-over-HTTP reasoning as /seed, gated by its own
// secret. Never creates/deletes records or touches any other role. Pass `?dryRun=true` to
// preview without writing.
router.post(
  '/fix-delivery-gender',
  asyncHandler(async (req, res) => {
    const configuredSecret = process.env.CLEANUP_SECRET;
    if (!configuredSecret) throw ApiError.notFound('Not found.');
    if (req.get('x-cleanup-secret') !== configuredSecret) throw ApiError.notFound('Not found.');

    const summary = await fixDeliveryPartnerGender({ dryRun: req.query.dryRun === 'true' });
    new ApiResponse(200, summary, 'Fix-up complete.').send(res);
  })
);

module.exports = router;
