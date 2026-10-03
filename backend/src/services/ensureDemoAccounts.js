const bcrypt = require('bcryptjs');
const City = require('../models/City');
const User = require('../models/User');
const env = require('../config/env');
const logger = require('../utils/logger');
const { SUPPORTED_CITIES } = require('../constants/cities');
const { DEMO_LOGINS } = require('../constants/demoAccounts');

const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$/;

// Every advertised demo login must accept the exact password printed on the login page. The
// seed steps create missing accounts, but (Admin aside) never revisited an existing account's
// password — so a demo password changed through the app's own Profile → Change password, or a
// value stored without bcrypt hashing, left that demo button failing with "Invalid email or
// password" for every visitor. Reads and writes only these specific demo emails, and writes
// only the passwordHash field, only when the stored hash genuinely fails bcrypt verification.
async function repairDemoCredentials() {
  for (const { email, password, role } of DEMO_LOGINS) {
    const user = await User.findOne({ email }).select('+passwordHash role');
    if (!user) {
      logger.warn(`Demo account still missing after bootstrap: ${email}`);
      continue;
    }
    if (user.role !== role) {
      logger.warn(`Demo account ${email} is registered as "${user.role}", not "${role}" — left unchanged.`);
      continue;
    }
    const hash = user.passwordHash || '';
    const verifies = BCRYPT_HASH.test(hash) && (await bcrypt.compare(password, hash).catch(() => false));
    if (!verifies) {
      await User.updateOne({ _id: user._id }, { $set: { passwordHash: await bcrypt.hash(password, 12) } });
      logger.warn(`Demo account password re-synced to its published value: ${email}`);
    }
  }
}

// Runs once on every server startup (see server.js), after connectDB() and before the process
// accepts traffic. Deliberately NOT the full seed.js pipeline (which also generates 1000+
// products and takes real time) — just enough that the four demo logins advertised on the
// login page always work, even against a completely empty, never-manually-seeded database
// (e.g. a freshly created MongoDB Atlas cluster pointed at for the first time). Every step here
// is the exact same idempotent upsert/find-or-create logic seed.js itself uses (imported, not
// duplicated), so running this on every boot against an already-seeded database is a cheap
// no-op, not a second copy of anything. It never deletes anything and never touches non-demo
// users, so it is safe against a production database holding real data.
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
    const { seedDemoAdmin, seedDemoAccounts, seedHeadlineDeliveryPartners } = require('../seed');
    const superAdmin = await seedDemoAdmin();
    await seedDemoAccounts(superAdmin, citiesByName);
    // The login/sign-up pages pick the Delivery demo account by the visitor's selected city
    // (Bengaluru/Chennai/Mumbai each have their own), so those must exist too — otherwise a
    // fresh database only had Hyderabad's, and Demo Delivery failed with "Invalid email or
    // password" for anyone browsing another city.
    await seedHeadlineDeliveryPartners(citiesByName);
    await repairDemoCredentials();
  } catch (err) {
    // Never block server startup over this — a real database/network problem here will surface
    // just as clearly on the next actual request, and demo-account creation failing shouldn't
    // take an otherwise-healthy API down.
    logger.error(`ensureDemoAccounts failed (server will still start): ${err.message}`);
  }
}

module.exports = ensureDemoAccounts;
