const env = require('../config/env');
const mailer = require('../config/mailer');
const twilioClient = require('../config/twilio');
const firebaseApp = require('../config/firebase');
const logger = require('../utils/logger');

async function sendEmail({ to, subject, html, text }) {
  if (!mailer) {
    logger.info(`[DEV EMAIL] to=${to} subject="${subject}"\n${text || html}`);
    return { devMode: true };
  }
  return mailer.sendMail({ from: env.smtp.from, to, subject, html, text });
}

async function sendSms({ to, body }) {
  if (!twilioClient) {
    logger.info(`[DEV SMS] to=${to} body="${body}"`);
    return { devMode: true };
  }
  return twilioClient.messages.create({ to, from: env.twilio.phoneNumber, body });
}

async function sendWhatsapp({ to, body }) {
  if (!twilioClient) {
    logger.info(`[DEV WHATSAPP] to=${to} body="${body}"`);
    return { devMode: true };
  }
  return twilioClient.messages.create({
    to: `whatsapp:${to}`,
    from: `whatsapp:${env.twilio.whatsappNumber}`,
    body,
  });
}

async function sendPush({ deviceToken, title, body }) {
  if (!firebaseApp) {
    logger.info(`[DEV PUSH] token=${deviceToken} title="${title}" body="${body}"`);
    return { devMode: true };
  }
  const admin = require('firebase-admin');
  return admin.messaging().send({ token: deviceToken, notification: { title, body } });
}

module.exports = { sendEmail, sendSms, sendWhatsapp, sendPush };
