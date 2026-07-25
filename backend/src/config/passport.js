const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const env = require('./env');
const logger = require('../utils/logger');
const User = require('../models/User');
const { ROLES } = require('../constants/roles');

if (env.isConfigured.google) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.google.clientId,
        clientSecret: env.google.clientSecret,
        callbackURL: env.google.callbackUrl,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails[0] && profile.emails[0].value;
          let user = await User.findOne({ $or: [{ googleId: profile.id }, { email }] });

          if (!user) {
            user = await User.create({
              name: profile.displayName || 'RentEase User',
              email,
              googleId: profile.id,
              authProvider: 'google',
              isEmailVerified: true,
              avatar: (profile.photos && profile.photos[0] && profile.photos[0].value) || '',
              role: ROLES.CUSTOMER,
            });
          } else if (!user.googleId) {
            user.googleId = profile.id;
            user.authProvider = 'google';
            user.isEmailVerified = true;
            await user.save();
          }

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
} else {
  logger.warn('Google OAuth credentials not configured — /api/v1/auth/google routes are disabled.');
}

module.exports = passport;
