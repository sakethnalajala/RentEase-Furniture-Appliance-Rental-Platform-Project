const City = require('../models/City');
const env = require('../config/env');
const logger = require('../utils/logger');
const { SUPPORTED_CITIES } = require('../constants/cities');

// Runs once on every server startup (see server.js), after connectDB() and before the process
// accepts traffic. Deliberately NOT the full seed.js pipeline (which also generates 1000+
// products and takes real time) — just enough that the four demo logins advertised on the
// login page always work, even against a completely empty, never-manually-seeded database
// (e.g. a freshly created MongoDB Atlas cluster pointed at for the first time). Every step here
// is the exact same idempotent upsert/find-or-create logic seed.js itself uses (imported, not
// duplicated), so running this on every boot against an already-seeded database is a cheap
// no-op, not a second copy of anything.
async function ensureDemoAccounts() {
  if (!env.demoMode) return;

  try {
    for (const city of SUPPORTED_CITIES) {
      await City.findOneAndUpdate({ name: city.name }, city, { upsert: true, new: true, setDefaultsOnInsert: true });
    }
    const cities = await City.find({});
    const citiesByName = Object.fromEntries(cities.map((c) => [c.name, c]));

    // Required lazily, not at module load time, to avoid a require cycle (seed.js requires a
    // long chain of models/services that don't need to be loaded just to boot the server).
    const { seedDemoAdmin, seedDemoAccounts } = require('../seed');
    const superAdmin = await seedDemoAdmin();
    await seedDemoAccounts(superAdmin, citiesByName);
  } catch (err) {
    // Never block server startup over this — a real database/network problem here will surface
    // just as clearly on the next actual request, and demo-account creation failing shouldn't
    // take an otherwise-healthy API down.
    logger.error(`ensureDemoAccounts failed (server will still start): ${err.message}`);
  }
}

module.exports = ensureDemoAccounts;
