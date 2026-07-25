const admin = require('firebase-admin');
const env = require('./env');
const logger = require('../utils/logger');

let app = null;

if (env.isConfigured.firebase) {
  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.firebase.projectId,
      clientEmail: env.firebase.clientEmail,
      privateKey: env.firebase.privateKey,
    }),
  });
} else {
  logger.warn('Firebase credentials not configured — push notifications will be logged to console instead of sent.');
}

module.exports = app;
