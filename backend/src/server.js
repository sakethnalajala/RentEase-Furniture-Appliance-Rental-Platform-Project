const app = require('./app');
const env = require('./config/env');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const { initRealtime } = require('./realtime');
const ensureDemoAccounts = require('./services/ensureDemoAccounts');

async function start() {
  try {
    await connectDB();
    await ensureDemoAccounts();
    const httpServer = app.listen(env.port, () => {
      logger.success(`RentEase API listening on port ${env.port} [${env.nodeEnv}]`);
    });
    initRealtime(httpServer);
  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
}

process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled rejection: ${err.message}`);
});

start();
