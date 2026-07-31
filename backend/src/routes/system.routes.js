const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const seed = require('../seed');
const ensureDemoAccounts = require('../services/ensureDemoAccounts');

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

// Narrow, temporary repair route: re-runs just the lightweight demo-account self-heal (see
// services/ensureDemoAccounts.js) against a live database, without the full seed()'s heavy
// product/order generation — for the one deployment path (Vercel serverless) that never runs
// server.js's own startup sequence, so ensureDemoAccounts() otherwise never gets a chance to
// run there at all. Reuses SEED_SECRET rather than introducing a new one; same "unset by
// default, 404s as not found" guard as /seed. Remove this route again once the live demo
// accounts are confirmed healthy — it isn't meant to be a permanent part of the API surface.
router.post(
  '/fix-demo-accounts',
  asyncHandler(async (req, res) => {
    const configuredSecret = process.env.SEED_SECRET;
    if (!configuredSecret) throw ApiError.notFound('Not found.');
    if (req.get('x-seed-secret') !== configuredSecret) throw ApiError.notFound('Not found.');

    await ensureDemoAccounts();
    new ApiResponse(200, null, 'Demo accounts checked/repaired.').send(res);
  })
);

module.exports = router;
