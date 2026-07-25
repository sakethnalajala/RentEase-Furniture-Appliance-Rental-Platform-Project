const nodemailer = require('nodemailer');
const env = require('./env');
const logger = require('../utils/logger');

let transporter = null;

if (env.isConfigured.smtp) {
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  });
} else {
  logger.warn('SMTP credentials not configured — emails will be logged to console instead of sent.');
}

module.exports = transporter;
