const twilio = require('twilio');
const env = require('./env');
const logger = require('../utils/logger');

let client = null;

if (env.isConfigured.twilio) {
  client = twilio(env.twilio.accountSid, env.twilio.authToken);
} else {
  logger.warn('Twilio credentials not configured — SMS/WhatsApp will be logged to console instead of sent.');
}

module.exports = client;
