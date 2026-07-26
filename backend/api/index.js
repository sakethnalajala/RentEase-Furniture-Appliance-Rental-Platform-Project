// Vercel serverless entry point. Not used in local development (nodemon runs src/server.js
// directly, which app.listen()s instead) — this file exists only so Vercel's Node runtime has
// a request handler to invoke per function call. It wraps the exact same Express `app` from
// src/app.js with a serverless-safe "ensure the DB is connected before handling this request"
// step, since there is no long-running startup phase to call connectDB() once ahead of time.
const app = require('../src/app');
const connectDB = require('../src/config/db');
const logger = require('../src/utils/logger');

module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (err) {
    logger.error(`Failed to connect to MongoDB: ${err.message}`);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      statusCode: 503,
      success: false,
      message: 'Database unavailable. Confirm MONGODB_URI is set correctly in the Vercel project settings.',
    }));
    return;
  }
  return app(req, res);
};
