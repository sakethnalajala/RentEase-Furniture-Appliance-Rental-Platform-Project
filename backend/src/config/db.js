const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

// Idempotent and concurrency-safe: repeated or overlapping calls (server.js's startup retry
// loop, seed.js) share one in-flight connect() instead of opening duplicate connections and
// exhausting Atlas's connection pool. readyState 1 (connected) short-circuits entirely.
let connectingPromise = null;
let listenersAttached = false;

// Always the existing `rentease` database, whatever (if any) database name the connection string's
// path carries — Atlas URIs copied from the "Connect" dialog often have none, which the driver
// would otherwise resolve to a database literally named "test".
const DB_NAME = 'rentease';

// Host part of the connection string for logs only (e.g. "rentease.xxxxx.mongodb.net" — the
// Atlas cluster), so the logs show which cluster was reached. URL.host never includes the
// username/password; multi-host strings that URL can't parse fall back to the driver's host.
const clusterHostOf = (uri) => {
  try {
    return new URL(uri).host || null;
  } catch {
    return null;
  }
};

// Last connection failure, already translated by describeDbError — read by the API's
// database-availability guard (app.js) and /health so a browser gets the real reason, not a
// bare "Failed to fetch" or a generic 500.
let lastError = null;

// Flipped by server.js once post-connect startup work (the demo-account bootstrap) has finished,
// so the API never serves a demo login against a fresh database the bootstrap hasn't filled yet.
let startupComplete = false;
const markStartupComplete = () => {
  startupComplete = true;
};

// Maps a raw driver/Mongoose error to a stable code plus an actionable message that is safe to
// show publicly: it never echoes the connection string, username, or password, only which part
// of the configuration to fix. Raw driver messages stay in server logs only (see server.js).
function describeDbError(err) {
  const text = `${err?.name || ''} ${err?.message || ''} ${err?.cause?.message || ''}`;

  if (err?.code === 'MONGODB_URI_MISSING') {
    return { code: 'MONGODB_URI_MISSING', message: 'MONGODB_URI is not set on the backend host.' };
  }
  if (err?.code === 18 || err?.codeName === 'AuthenticationFailed' || /bad auth|authentication failed/i.test(text)) {
    return {
      code: 'AUTH_FAILED',
      message:
        'MongoDB rejected the database username/password in the backend\'s MONGODB_URI. If the Atlas database user\'s password was changed, update MONGODB_URI on the backend host (URL-encode special characters in the password) and redeploy.',
    };
  }
  if (err?.name === 'MongoParseError' || /invalid scheme|URI must include|unescaped|Invalid connection string/i.test(text)) {
    return { code: 'INVALID_URI', message: 'MONGODB_URI on the backend host is not a valid MongoDB connection string.' };
  }
  if (/ENOTFOUND|querySrv|EAI_AGAIN/i.test(text)) {
    return { code: 'DNS_FAILED', message: 'The cluster hostname in MONGODB_URI could not be resolved. Check the host part of the connection string.' };
  }
  if (err?.name === 'MongooseServerSelectionError' || err?.name === 'MongoServerSelectionError' || /ECONNREFUSED|ETIMEDOUT|timed out/i.test(text)) {
    return {
      code: 'UNREACHABLE',
      message: 'The MongoDB cluster could not be reached. In MongoDB Atlas → Network Access, allow the backend host (0.0.0.0/0 for Render\'s free tier).',
    };
  }
  return { code: 'CONNECTION_FAILED', message: 'The API could not connect to MongoDB. Check the backend logs for details.' };
}

function getDbStatus() {
  const connected = mongoose.connection.readyState === 1;
  return { connected, ready: connected && startupComplete, startupComplete, lastError, dbName: DB_NAME };
}

function attachListenersOnce() {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB connection error: ${err.message}`);
  });
  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
}

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  if (connectingPromise) return connectingPromise;

  if (!env.mongodbUri) {
    const err = new Error('MONGODB_URI is not set.');
    err.code = 'MONGODB_URI_MISSING';
    lastError = describeDbError(err);
    throw err;
  }

  mongoose.set('strictQuery', true);
  attachListenersOnce();

  connectingPromise = mongoose
    // A 10s server-selection timeout (driver default: 30s) surfaces a wrong password, blocked IP,
    // or bad hostname quickly instead of leaving the first requests hanging.
    .connect(env.mongodbUri, { dbName: DB_NAME, serverSelectionTimeoutMS: 10000 })
    .then(() => {
      lastError = null;
      const cluster = clusterHostOf(env.mongodbUri) || mongoose.connection.host;
      logger.info(`MongoDB connected — cluster: ${cluster}, database: ${mongoose.connection.name}`);
    })
    .catch((err) => {
      lastError = describeDbError(err);
      throw err;
    })
    .finally(() => {
      connectingPromise = null;
    });

  return connectingPromise;
}

module.exports = connectDB;
module.exports.describeDbError = describeDbError;
module.exports.getDbStatus = getDbStatus;
module.exports.markStartupComplete = markStartupComplete;
