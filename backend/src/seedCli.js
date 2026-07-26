// Standalone CLI entry point for `npm run seed` / `node src/seedCli.js` — owns the
// process-lifecycle concerns (exit codes) that seed.js itself must not, since seed.js's
// exported function is also called from within a live request handler (see seed.js's own
// comment on this).
const seed = require('./seed');

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`Seed failed: ${err.message}`);
    process.exit(1);
  });
