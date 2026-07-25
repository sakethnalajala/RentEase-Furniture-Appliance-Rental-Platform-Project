const Razorpay = require('razorpay');
const env = require('./env');
const logger = require('../utils/logger');

let instance = null;

if (env.isConfigured.razorpay) {
  instance = new Razorpay({ key_id: env.razorpay.keyId, key_secret: env.razorpay.keySecret });
} else {
  logger.warn('Razorpay keys not configured — payment endpoints will run in mocked dev mode (Phase 3).');
}

module.exports = instance;
