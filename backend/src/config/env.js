require('dotenv').config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rentease',

  // Demo Mode relaxes a handful of real-world gates (mandatory email verification,
  // real OTP delivery/matching) so the whole app can be clicked through end-to-end with
  // no SMTP/SMS provider and made-up contact details — portfolio/demo convenience only.
  // Set DEMO_MODE=false for anything resembling a real deployment.
  demoMode: process.env.DEMO_MODE !== 'false',

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret_change_me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_me',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  emailTokenSecret: process.env.EMAIL_TOKEN_SECRET || 'dev_email_token_secret_change_me',

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'RentEase <no-reply@rentease.com>',
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
    whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || '',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/v1/auth/google/callback',
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  },

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    // Covers everything the public catalog skip (see rateLimiter.js) doesn't already exempt —
    // cart/wishlist/notification checks fired per card across a dozen product rails add up
    // fast in a single-page-app session, so this needs real headroom, not just DoS-scale limits.
    max: Number(process.env.RATE_LIMIT_MAX) || 2000,
  },
};

env.isConfigured = {
  smtp: Boolean(env.smtp.host && env.smtp.user && env.smtp.pass),
  twilio: Boolean(env.twilio.accountSid && env.twilio.authToken),
  google: Boolean(env.google.clientId && env.google.clientSecret),
  cloudinary: Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret),
  razorpay: Boolean(env.razorpay.keyId && env.razorpay.keySecret),
  firebase: Boolean(env.firebase.projectId && env.firebase.clientEmail && env.firebase.privateKey),
};

module.exports = env;
