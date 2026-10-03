const app = require('./app');
const env = require('./config/env');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const { initRealtime } = require('./realtime');
const ensureDemoAccounts = require('./services/ensureDemoAccounts');

const { describeDbError, markStartupComplete } = connectDB;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Keeps retrying instead of exiting: a process that exits on a database error makes Render
// crash-loop, and every browser request then dies as an opaque "Failed to fetch" with no CORS
// headers. Staying up lets app.js's database guard answer with a readable 503 explaining what to
// fix, and lets the API recover by itself once Atlas is reachable again (e.g. after a Network
// Access change, which doesn't trigger a redeploy). Fixing MONGODB_URI itself does redeploy.
async function connectWithRetry() {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await connectDB();
      await ensureDemoAccounts();
      markStartupComplete();
      return;
    } catch (err) {
      const { code, message } = describeDbError(err);
      // Raw driver text is logged (never sent to clients) except for parse errors, the one
      // category whose message could quote part of the connection string back.
      const detail = code === 'INVALID_URI' ? '' : ` (${err.message})`;
      const delayMs = Math.min(5000 * attempt, 30000);
      logger.error(`MongoDB connection failed [${code}] on attempt ${attempt}: ${message}${detail} Retrying in ${delayMs / 1000}s.`);
      await sleep(delayMs);
    }
  }
}

function start() {
  const httpServer = app.listen(env.port, () => {
    logger.success(`RentEase API listening on port ${env.port} [${env.nodeEnv}]`);
  });
  initRealtime(httpServer);
  connectWithRetry();
}

process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled rejection: ${err.message}`);
});

start();
