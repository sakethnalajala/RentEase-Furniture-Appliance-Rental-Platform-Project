// Read-only check of a real database (e.g. production MongoDB Atlas) — which database the app
// lands in, what it holds, and whether every "Login as Demo …" account will authenticate:
//
//   node --env-file=<file containing MONGODB_URI> scripts/checkDemoAccounts.js
//
// Uses the API's own connection code (so the database is always `rentease`), performs no writes,
// and never prints the connection string, password hashes, or any non-demo user's details.
// Anything flagged except a role conflict is repaired automatically the next time the API starts
// (services/ensureDemoAccounts.js).
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Vendor = require('../src/models/Vendor');
const DeliveryPartner = require('../src/models/DeliveryPartner');
const { ROLES } = require('../src/constants/roles');
const { VENDOR_STATUS } = require('../src/constants/inventoryStatus');
const { DEMO_LOGINS } = require('../src/constants/demoAccounts');

async function checkDemoLogin({ email, password, role, city }) {
  const label = `${role}${city ? ` (${city})` : ''}`.padEnd(30);
  const user = await User.findOne({ email }).select('+passwordHash role isActive isEmailVerified twoFactor');
  if (!user) return { label, email, problems: ['missing'] };

  const problems = [];
  if (user.role !== role) problems.push(`registered as "${user.role}" (role conflict — not auto-repaired)`);
  if (!user.isActive) problems.push('deactivated');
  if (!user.isEmailVerified) problems.push('email not verified');
  const hash = user.passwordHash || '';
  if (!/^\$2[aby]\$\d{2}\$/.test(hash)) problems.push('password not stored as a bcrypt hash');
  else if (!(await bcrypt.compare(password, hash))) problems.push('password differs from the published demo password');

  if (role === ROLES.VENDOR) {
    const vendor = await Vendor.findOne({ user: user._id }).select('status');
    if (!vendor) problems.push('no vendor profile');
    else if (vendor.status !== VENDOR_STATUS.APPROVED) problems.push(`vendor status "${vendor.status}"`);
  }
  if (role === ROLES.DELIVERY_PARTNER) {
    const partner = await DeliveryPartner.findOne({ user: user._id }).select('status');
    if (!partner) problems.push('no delivery partner profile');
    else if (partner.status !== VENDOR_STATUS.APPROVED) problems.push(`partner status "${partner.status}"`);
  }
  const note = role === ROLES.ADMIN ? ` [2FA ${user.twoFactor?.enabled ? 'enabled' : 'set up on first login'}]` : '';
  return { label, email, problems, note };
}

async function main() {
  await connectDB();
  const { db } = mongoose.connection;
  console.log(`\nDatabase: ${db.databaseName}`);

  const names = (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name).sort();
  console.log(`Collections (${names.length}):`);
  for (const name of names) {
    console.log(`  ${name.padEnd(26)} ${await db.collection(name).estimatedDocumentCount()}`);
  }

  const byRole = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]);
  console.log(`\nUsers by role: ${byRole.map((r) => `${r._id}=${r.count}`).join(', ')}`);

  console.log('\nDemo logins:');
  let failures = 0;
  for (const demo of DEMO_LOGINS) {
    const { label, email, problems, note = '' } = await checkDemoLogin(demo);
    if (problems.length) failures += 1;
    console.log(`  ${problems.length ? 'NEEDS FIX' : 'OK       '} ${label} ${email}${note}${problems.length ? ` — ${problems.join('; ')}` : ''}`);
  }
  console.log(failures ? `\n${failures} demo login(s) need attention (repaired automatically on the next API start unless noted).` : '\nAll demo logins will authenticate.');
}

main()
  .catch((err) => {
    const { code, message } = connectDB.describeDbError(err);
    console.error(`\nCould not complete the check [${code}]: ${message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
