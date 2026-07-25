const express = require('express');
const passport = require('../config/passport');
const env = require('../config/env');
const validate = require('../middlewares/validate');
const { authenticate, optionalAuthenticate } = require('../middlewares/auth');
const { authLimiter } = require('../middlewares/rateLimiter');
const ctrl = require('../controllers/auth.controller');
const {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  otpRequestSchema,
  otpVerifySchema,
  twoFaVerifySchema,
  twoFaEnableSchema,
  selectGoogleAccountSchema,
} = require('../validators/auth.validator');
const { z } = require('zod');

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), ctrl.register);
router.post('/verify-email', validate(verifyEmailSchema), ctrl.verifyEmail);
router.post('/resend-verification', authLimiter, validate(z.object({ email: z.string().email() })), ctrl.resendVerificationEmail);

router.post('/login', authLimiter, validate(loginSchema), ctrl.login);
router.post('/login/2fa', authLimiter, validate(twoFaVerifySchema), ctrl.login2FAVerify);

// Reached either mid-login (mandatory 2FA setup, carries a tempToken, no session yet)
// or by an already-authenticated customer/vendor opting in — optionalAuthenticate covers both.
router.post(
  '/2fa/setup',
  authLimiter,
  optionalAuthenticate,
  validate(z.object({ tempToken: z.string().optional() })),
  ctrl.setup2FA
);
router.post(
  '/2fa/enable',
  authLimiter,
  optionalAuthenticate,
  validate(twoFaEnableSchema.extend({ tempToken: z.string().optional() })),
  ctrl.enable2FA
);
router.post('/2fa/disable', authenticate, validate(twoFaEnableSchema), ctrl.disable2FA);

router.post('/otp/request', authLimiter, validate(otpRequestSchema), ctrl.requestPhoneOtp);
router.post('/otp/verify', authLimiter, validate(otpVerifySchema), ctrl.verifyPhoneOtp);

router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), ctrl.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), ctrl.resetPassword);

router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);

if (env.isConfigured.google) {
  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
  router.get(
    '/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: `${env.clientUrl}/login?error=google_auth_failed` }),
    ctrl.googleCallback
  );
} else if (env.demoMode) {
  // No real Google OAuth credentials configured — simulate it instead of leaving
  // `GET /auth/google` unregistered (which the frontend's "Continue with Google" button was
  // hitting directly as a full-page navigation, landing on the API's bare 404 JSON response).
  // See simulateGoogleLogin's own comment for exactly what "simulate" means here.
  router.get('/google', ctrl.simulateGoogleLogin);
} else {
  // Neither a real Google integration nor Demo Mode — still register the route so the button
  // never 404s; redirect back to login with a clear, honest message instead of simulating a
  // login (simulating one outside Demo Mode would silently sign into a real account's session
  // via an unauthenticated GET request, which is a real security hole `simulateGoogleLogin`'s
  // Demo Mode gate exists specifically to avoid).
  router.get('/google', (req, res) => res.redirect(`${env.clientUrl}/login?error=${encodeURIComponent('Google sign-in is not configured on this server.')}`));
}

// The real "Continue with Google" button's actual flow (Demo Mode only — both controllers
// self-guard on env.demoMode too, this is defense in depth): list which accounts of the
// selected role a picker could offer, then sign into a specifically-chosen one. Registered
// unconditionally rather than inside the if/else above since these are independent of whether
// real Google OAuth is configured — they're the simulated-account-picker feature, not a
// redirect-based OAuth entry point.
router.get('/google/accounts', ctrl.listGoogleAccounts);
router.post('/google/select', authLimiter, validate(selectGoogleAccountSchema), ctrl.selectGoogleAccount);

module.exports = router;
