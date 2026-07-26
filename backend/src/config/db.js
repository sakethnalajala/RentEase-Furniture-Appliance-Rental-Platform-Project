const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

// Idempotent and concurrency-safe: on a long-running server this only ever runs once at
// startup, but on Vercel's serverless runtime this same module can be re-invoked by multiple
// concurrent requests against a warm (already-connected) function instance, or by overlapping
// requests during a cold start — calling mongoose.connect() again in either case would open
// duplicate connections and exhaust Atlas's connection pool. readyState 1 (connected) short-
// circuits the former; caching the in-flight connect() promise handles the latter.
let connectingPromise = null;

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  if (connectingPromise) return connectingPromise;

  mongoose.set('strictQuery', true);
  connectingPromise = mongoose
    .connect(env.mongodbUri)
    .then(() => {
      logger.info(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
    })
    .finally(() => {
      connectingPromise = null;
    });

  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  return connectingPromise;
}

module.exports = connectDB;
