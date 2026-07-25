const app = require('./app');
const env = require('./config/env');
const connectDB = require('./config/db');
const logger = require('./utils/logger');

async function start() {
  try {
    await connectDB();
    app.listen(env.port, () => {
      logger.success(`RentEase API listening on port ${env.port} [${env.nodeEnv}]`);
    });
  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
}

process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled rejection: ${err.message}`);
});

start();
