const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const env = require('../config/env');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const DeliveryPartner = require('../models/DeliveryPartner');
const City = require('../models/City');
const tokenService = require('../services/tokenService');
const otpService = require('../services/otpService');
const twoFactorService = require('../services/twoFactorService');
const notificationService = require('../services/notificationService');
const { generateVendorDemoData } = require('../services/vendorOnboardingService');
const { generateCustomerDemoData } = require('../services/customerOnboardingService');
const { generateDeliveryPartnerDemoData } = require('../services/deliveryOnboardingService');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');
const { ROLES, ALL_ROLES, MANDATORY_2FA_ROLES } = require('../constants/roles');
const { VENDOR_STATUS } = require('../constants/inventoryStatus');
const { DEMO_ACCOUNTS, DELIVERY_PARTNERS_BY_CITY } = require('../constants/demoAccounts');

const REFRESH_COOKIE_NAME = 'rentease_refresh_token';

// `rememberMe` false (the default everywhere except an explicit checked "Remember me" on the
// manual login form) omits `maxAge` entirely, which makes this a true session cookie per the
// Set-Cookie spec — the browser drops it the moment the browser process itself closes, so a
// fresh browser launch (not just a new tab) lands back on the public site logged out, without
// needing any client-side "clear on startup" logic. `rememberMe: true` keeps the previous
// 30-day persistent behavior.
const refreshCookieOptions = (rememberMe = false) => ({
  httpOnly: true,
  // Vercel (client) and Render (server) sit on different registrable domains in production,
  // so the refresh cookie needs SameSite=None (+ Secure, which it requires) to survive the
  // cross-site fetch; localhost:3000 -> localhost:5000 is same-site, so Lax works in dev.
  secure: env.nodeEnv === 'production',
  sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
  path: '/api/v1/auth',
  ...(rememberMe ? { maxAge: 30 * 24 * 60 * 60 * 1000 } : {}),
});

const hashRawToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

const toSafeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  avatar: user.avatar,
  isEmailVerified: user.isEmailVerified,
  twoFactorEnabled: user.twoFactor?.enabled || false,
  selectedCity: user.selectedCity,
  createdAt: user.createdAt,
});

async function sendVerificationEmail(user) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  user.emailVerificationTokenHash = hashRawToken(rawToken);
  user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();

  const link = `${env.clientUrl}/verify-email?token=${rawToken}`;
  await notificationService.sendEmail({
    to: user.email,
    subject: 'Verify your RentEase email address',
    html: `<p>Hi ${user.name},</p><p>Please verify your email by clicking the link below:</p><p><a href="${link}">${link}</a></p><p>This link expires in 24 hours.</p>`,
    text: `Verify your email: ${link}`,
  });
}

const ROLE_LABELS = {
  [ROLES.CUSTOMER]: 'Customer',
  [ROLES.VENDOR]: 'Vendor',
  [ROLES.DELIVERY_PARTNER]: 'Delivery',
  [ROLES.ADMIN]: 'Admin',
};

// ---- Register ----
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role, businessName, cityId, vehicleType, vehicleNumber, licenseNumber } =
    req.body;

  const existing = await User.findOne({ $or: [{ email }, ...(phone ? [{ phone }] : [])] });
  if (existing) throw ApiError.conflict('An account with this email or phone already exists.');

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    name,
    email,
    phone,
    passwordHash,
    role: role || ROLES.CUSTOMER,
    // Demo Mode auto-verifies so the account is immediately usable without a real inbox
    // to click a link in — see env.demoMode for the full rationale.
    isEmailVerified: env.demoMode,
    twoFactor: { mandatory: MANDATORY_2FA_ROLES.includes(role) },
    // The registration form always collects a city, regardless of role — persist it as the
    // account's own selectedCity immediately (not just used to seed demo data for
    // vendor/delivery-partner/customer below) so city-scoped admin views find this account
    // right away instead of only after the customer manually picks a city post-login.
    selectedCity: cityId || undefined,
  });

  if (role === ROLES.VENDOR) {
    // Self-registered vendors are auto-approved and immediately usable — per explicit product
    // direction this app no longer gates a new vendor's first login behind manual Super Admin
    // review (Admin can still suspend/reject a vendor after the fact via the real Vendor
    // Management actions; those gates in assertUserCanLogin are untouched). `approvedBy: null`
    // marks this as a system auto-approval rather than a specific admin's decision.
    const vendor = await Vendor.create({
      user: user._id,
      businessName,
      city: cityId,
      status: VENDOR_STATUS.APPROVED,
      approvedAt: new Date(),
    });
    // Give the vendor its own real, independent-looking business the moment it's created —
    // own product catalog, own order history, own notifications — not Demo Vendor's data and
    // not an empty dashboard. Awaited so the account is actually ready by the time registration
    // responds (this app auto-logs a new vendor straight into their dashboard right after
    // signup — see register/page.js — so the data needs to exist before that happens, not
    // trickle in afterward). Failures here shouldn't block registration itself.
    try {
      await generateVendorDemoData(vendor);
    } catch (err) {
      logger.error(`Vendor onboarding data generation failed for ${vendor.businessName}: ${err.message}`);
    }
  } else if (role === ROLES.DELIVERY_PARTNER) {
    // A starting `currentLocation` near their assigned city's center (small random jitter, so
    // partners in the same city don't all show the exact same point on an admin map) — clearly
    // demo/simulated data per the product spec, since this app has no real GPS integration.
    const city = await City.findById(cityId).select('lat lng');
    const jitter = () => (Math.random() - 0.5) * 0.08; // ~± a few km at these latitudes
    const partner = await DeliveryPartner.create({
      user: user._id,
      vehicleType,
      vehicleNumber,
      licenseNumber,
      assignedCity: cityId,
      currentLocation: city ? { lat: city.lat + jitter(), lng: city.lng + jitter() } : undefined,
    });
    // Same reasoning as the vendor onboarding above — a brand new partner's History/Earnings/
    // Ratings should show real (if modest) activity from the first login, not an empty
    // dashboard. Open delivery requests need no seeding: they're topped up per-city at runtime.
    try {
      await generateDeliveryPartnerDemoData(partner);
    } catch (err) {
      logger.error(`Delivery partner onboarding data generation failed for user ${user._id}: ${err.message}`);
    }
  } else if (role === ROLES.CUSTOMER) {
    // Wishlist/Cart/Address/Order history seeded from the real product catalog in this
    // customer's own city — same "real account, real data, non-empty from first login"
    // treatment vendors and delivery partners already get above.
    try {
      await generateCustomerDemoData(user, cityId);
    } catch (err) {
      logger.error(`Customer onboarding data generation failed for user ${user._id}: ${err.message}`);
    }
  } else if (role === ROLES.ADMIN) {
    // Admin dashboards are platform-wide (every vendor/customer/order/analytics figure is
    // already real and non-empty regardless of which admin is looking), so there's nothing
    // per-account to seed beyond a welcome notification for this specific new admin.
    try {
      await Notification.create({
        user: user._id,
        title: 'Welcome to RentEase Admin',
        message: 'Your Super Administrator account is ready. You have full platform access.',
        type: 'system',
        channels: ['in_app'],
        isRead: false,
      });
    } catch (err) {
      logger.error(`Admin welcome notification failed for user ${user._id}: ${err.message}`);
    }
  }

  if (!env.demoMode) await sendVerificationEmail(user);

  const roleLabel = ROLE_LABELS[role] || 'Customer';

  new ApiResponse(
    201,
    // Vendors are auto-approved above, so this is always false for a fresh self-registration —
    // kept as a real field (not hardcoded false) so it still reflects reality if that ever
    // changes, rather than silently going stale.
    { userId: user._id, requiresVendorApproval: false, demoMode: env.demoMode },
    env.demoMode
      ? `${roleLabel} account created successfully.`
      : 'Registration successful. Please check your email to verify your account.'
  ).send(res);
});

// ---- Email verification ----
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const tokenHash = hashRawToken(token);

  const user = await User.findOne({
    emailVerificationTokenHash: tokenHash,
    emailVerificationExpires: { $gt: new Date() },
  }).select('+emailVerificationTokenHash +emailVerificationExpires');

  if (!user) throw ApiError.badRequest('Verification link is invalid or has expired.');

  user.isEmailVerified = true;
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  new ApiResponse(200, null, 'Email verified successfully. You can now log in.').send(res);
});

const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (user && !user.isEmailVerified) await sendVerificationEmail(user);
  new ApiResponse(200, null, 'If an unverified account exists for this email, a verification link has been sent.').send(res);
});

// ---- Shared: issue tokens after all checks pass, set cookie, respond ----
async function issueSessionAndRespond(res, user, statusCode = 200, message = 'Success', rememberMe = false) {
  const meta = {};
  const { accessToken, refreshToken } = await tokenService.issueTokenPair(user, meta, rememberMe);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions(rememberMe));
  // Populated (not a bare ObjectId) so the frontend can read `.name`/`.state` straight off the
  // login response and auto-select the account's city without a follow-up /users/me round trip
  // — mirrors what GET /users/me already does.
  if (user.selectedCity && !user.selectedCity.name) {
    await user.populate('selectedCity', 'name state');
  }
  // Echoed back (not just applied to the cookie) so the frontend's non-httpOnly `rentease_role`
  // cookie — and any restored-session path, e.g. after a silent /auth/refresh — can mirror the
  // exact same persistence choice without needing to track it separately client-side.
  new ApiResponse(statusCode, { user: toSafeUser(user), accessToken, rememberMe }, message).send(res);
}

// `rememberMe` rides along in the temp token so a 2FA-enabled user's "Remember me" choice at
// the initial login step survives into the separate login2FAVerify request that finishes it.
const generate2FATempToken = (user, purpose, rememberMe = false) =>
  jwt.sign({ sub: user._id.toString(), purpose, rememberMe }, env.jwt.accessSecret, { expiresIn: '10m' });

const verify2FATempToken = (token, expectedPurpose) => {
  let payload;
  try {
    payload = jwt.verify(token, env.jwt.accessSecret);
  } catch (err) {
    throw ApiError.unauthorized('Session expired. Please log in again.');
  }
  if (payload.purpose !== expectedPurpose) throw ApiError.unauthorized('Invalid session token.');
  return payload;
};

// Shared account-standing checks for every login entry point (password, phone OTP, Google) —
// a Vendor or Delivery Partner stuck in "pending"/"rejected"/"suspended" must be blocked
// everywhere, not just the main password form, otherwise phone-OTP or Google sign-in with the
// same email would bypass it.
async function assertUserCanLogin(user) {
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated.');
  if (!user.isEmailVerified) throw ApiError.forbidden('Please verify your email before logging in.');

  if (user.role === ROLES.VENDOR) {
    const vendor = await Vendor.findOne({ user: user._id });
    if (!vendor || vendor.status === VENDOR_STATUS.PENDING) {
      throw ApiError.forbidden('Your vendor application is still pending Admin approval.');
    }
    if (vendor.status === VENDOR_STATUS.REJECTED) {
      throw ApiError.forbidden(`Your vendor application was rejected${vendor.rejectionReason ? `: ${vendor.rejectionReason}` : '.'}`);
    }
    if (vendor.status === VENDOR_STATUS.SUSPENDED) {
      throw ApiError.forbidden('Your vendor account has been suspended. Contact support for details.');
    }
  }

  if (user.role === ROLES.DELIVERY_PARTNER) {
    const partner = await DeliveryPartner.findOne({ user: user._id });
    if (!partner || partner.status === VENDOR_STATUS.PENDING) {
      throw ApiError.forbidden('Your delivery partner application is still pending Admin approval.');
    }
    if (partner.status === VENDOR_STATUS.REJECTED) {
      throw ApiError.forbidden(`Your delivery partner application was rejected${partner.rejectionReason ? `: ${partner.rejectionReason}` : '.'}`);
    }
    if (partner.status === VENDOR_STATUS.SUSPENDED) {
      throw ApiError.forbidden('Your delivery partner account has been suspended. Contact support for details.');
    }
  }
}

// ---- Login (email + password) ----
const login = asyncHandler(async (req, res) => {
  const { email, password, role, rememberMe } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash +twoFactor.secret');
  if (!user || !user.passwordHash) throw ApiError.unauthorized('Invalid email or password.');

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) throw ApiError.unauthorized('Invalid email or password.');

  // Strict role-tab validation: these credentials must belong to an account of the role the
  // user selected on the login page. Without this, a Vendor's credentials entered while the
  // Customer tab is selected would silently authenticate and open the Vendor Dashboard — the
  // login page's role tabs looked like an account-type filter but never actually enforced one.
  // Deliberately the same generic message as a wrong password, not "this is a Vendor account,"
  // so the error can't be used to enumerate which role an email is registered under.
  if (role && user.role !== role) {
    throw ApiError.unauthorized('Invalid email or password for the selected account type.');
  }

  await assertUserCanLogin(user);

  if (MANDATORY_2FA_ROLES.includes(user.role) && !user.twoFactor.enabled) {
    const tempToken = generate2FATempToken(user, '2fa_setup', rememberMe);
    return new ApiResponse(200, { requires2FASetup: true, tempToken }, 'Two-factor authentication setup is required for this role.').send(res);
  }

  if (user.twoFactor.enabled) {
    const tempToken = generate2FATempToken(user, '2fa_verify', rememberMe);
    return new ApiResponse(200, { requires2FA: true, tempToken }, 'Enter your two-factor authentication code.').send(res);
  }

  user.lastLoginAt = new Date();
  await user.save();
  await issueSessionAndRespond(res, user, 200, 'Login successful.', rememberMe);
});

// ---- 2FA: verify code at login ----
const login2FAVerify = asyncHandler(async (req, res) => {
  const { tempToken, code } = req.body;
  const payload = verify2FATempToken(tempToken, '2fa_verify');

  const user = await User.findById(payload.sub).select('+twoFactor.secret');
  if (!user) throw ApiError.unauthorized('User not found.');

  // Demo Mode accepts any well-formed 6-digit code — same reasoning and pattern as
  // verifyPhoneOtp above: no real authenticator app is required to exercise this app's
  // mandatory-2FA flow for Admin/Super Admin. `twoFaVerifySchema` already enforces the 6-digit
  // shape at the validation layer, so this is just documenting the bypass, not re-checking it.
  const isValid = env.demoMode || twoFactorService.verifyToken(user.twoFactor.secret, code);
  if (!isValid) throw ApiError.badRequest('Incorrect authentication code.');

  user.lastLoginAt = new Date();
  await user.save();
  await issueSessionAndRespond(res, user, 200, 'Login successful.', payload.rememberMe);
});

// ---- 2FA: setup (generate secret + QR), mandatory-role first-login flow or opt-in ----
const setup2FA = asyncHandler(async (req, res) => {
  let user;
  if (req.body.tempToken) {
    const payload = verify2FATempToken(req.body.tempToken, '2fa_setup');
    user = await User.findById(payload.sub);
  } else {
    user = req.user; // authenticated opt-in flow for customer/vendor
  }
  if (!user) throw ApiError.unauthorized('User not found.');

  const secret = twoFactorService.generateSecret(user.email);
  user.twoFactor.secret = secret.base32;
  await user.save();

  const qrCodeDataUrl = await twoFactorService.generateQrCodeDataUrl(secret.otpauth_url);
  const tempToken = req.body.tempToken || generate2FATempToken(user, '2fa_setup');

  new ApiResponse(200, { qrCodeDataUrl, secret: secret.base32, tempToken }, 'Scan the QR code with your authenticator app, then confirm with a code.').send(res);
});

// ---- 2FA: confirm setup with a code, enabling it ----
const enable2FA = asyncHandler(async (req, res) => {
  const { code } = req.body;
  let user;
  let rememberMe = false;
  if (req.body.tempToken) {
    const payload = verify2FATempToken(req.body.tempToken, '2fa_setup');
    user = await User.findById(payload.sub).select('+twoFactor.secret');
    // Carries the original login form's "Remember me" choice through the mandatory-2FA-setup
    // detour (Admin's first login) the same way login2FAVerify does for the plain 2FA-verify path.
    rememberMe = payload.rememberMe || false;
  } else {
    user = await User.findById(req.user._id).select('+twoFactor.secret');
  }

  if (!user || !user.twoFactor.secret) throw ApiError.badRequest('Start 2FA setup first.');

  // Demo Mode accepts any well-formed 6-digit code — see the matching comment on
  // login2FAVerify above. Without this, the mandatory-2FA-setup flow every Admin/Super Admin
  // account goes through on first login is unusable without a real authenticator app scanning
  // the QR code and staying in sync with it.
  const isValid = env.demoMode || twoFactorService.verifyToken(user.twoFactor.secret, code);
  if (!isValid) throw ApiError.badRequest('Incorrect authentication code.');

  user.twoFactor.enabled = true;
  user.lastLoginAt = new Date();
  await user.save();

  await issueSessionAndRespond(res, user, 200, 'Two-factor authentication enabled.', rememberMe);
});

const disable2FA = asyncHandler(async (req, res) => {
  if (MANDATORY_2FA_ROLES.includes(req.user.role)) {
    throw ApiError.forbidden('Two-factor authentication is mandatory for this role and cannot be disabled.');
  }
  const { code } = req.body;
  const user = await User.findById(req.user._id).select('+twoFactor.secret');
  const isValid = twoFactorService.verifyToken(user.twoFactor.secret, code);
  if (!isValid) throw ApiError.badRequest('Incorrect authentication code.');

  user.twoFactor.enabled = false;
  user.twoFactor.secret = undefined;
  await user.save();
  new ApiResponse(200, null, 'Two-factor authentication disabled.').send(res);
});

// ---- Phone + OTP login ----
const requestPhoneOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  const user = await User.findOne({ phone });

  // In Demo Mode, an OTP is issued for any phone number (not just registered ones) so the
  // "log in with any phone number" demo flow works with no prior registration required.
  if (user || env.demoMode) {
    const code = await otpService.createOtp(phone, 'phone_login');
    await notificationService.sendSms({ to: phone, body: `Your RentEase login code is ${code}. It expires in 5 minutes.` });

    if (env.demoMode) {
      return new ApiResponse(200, { demoOtp: code }, 'OTP sent successfully.').send(res);
    }
  }
  // Non-demo mode: always return a generic response to avoid leaking which phone numbers
  // are registered.
  new ApiResponse(200, null, 'If this phone number is registered, an OTP has been sent.').send(res);
});

const verifyPhoneOtp = asyncHandler(async (req, res) => {
  const { phone, code } = req.body;

  if (env.demoMode) {
    // Demo Mode accepts any 6-digit code — no real SMS provider is wired up, so the "OTP"
    // shown to the user by requestPhoneOtp is just a preview, not something we require back.
    if (!/^\d{6}$/.test(code)) throw ApiError.badRequest('Enter a 6-digit code.');
  } else {
    // Verify the OTP before looking the account up: requestPhoneOtp only ever creates an
    // OTP record for phones with an existing account, so a generic "no active OTP" failure
    // here reveals nothing about whether the phone number is registered.
    await otpService.verifyOtp(phone, 'phone_login', code);
  }

  let user = await User.findOne({ phone }).select('+twoFactor.secret');

  if (!user && env.demoMode) {
    // Demo Mode: phone login works for numbers that were never registered by silently
    // creating a customer account for them, matching the "any phone number works" demo ask.
    const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 12);
    user = await User.create({
      name: 'Demo Customer',
      email: `demo.${phone}.${Date.now()}@rentease.local`,
      phone,
      passwordHash,
      role: ROLES.CUSTOMER,
      isEmailVerified: true,
    });
    // Same onboarding every other new customer gets (see register() above) — no city is known
    // on this phone-only flow, so the service falls back to any active product catalog.
    try {
      await generateCustomerDemoData(user, null);
    } catch (err) {
      logger.error(`Customer onboarding data generation failed for user ${user._id}: ${err.message}`);
    }
  }

  if (!user) throw ApiError.notFound('Account not found.');

  await assertUserCanLogin(user);

  if (user.twoFactor.enabled) {
    const tempToken = generate2FATempToken(user, '2fa_verify');
    return new ApiResponse(200, { requires2FA: true, tempToken }, 'Enter your two-factor authentication code.').send(res);
  }

  user.lastLoginAt = new Date();
  await user.save();
  await issueSessionAndRespond(res, user, 200, 'Login successful.');
});

// ---- Forgot / reset password ----
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetTokenHash = hashRawToken(rawToken);
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const link = `${env.clientUrl}/reset-password?token=${rawToken}`;
    await notificationService.sendEmail({
      to: user.email,
      subject: 'Reset your RentEase password',
      html: `<p>Hi ${user.name},</p><p>Reset your password using the link below (valid for 1 hour):</p><p><a href="${link}">${link}</a></p>`,
      text: `Reset your password: ${link}`,
    });
  }

  new ApiResponse(200, null, 'If an account exists for this email, a password reset link has been sent.').send(res);
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  const tokenHash = hashRawToken(token);

  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetTokenHash +passwordResetExpires');

  if (!user) throw ApiError.badRequest('Reset link is invalid or has expired.');

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  await tokenService.revokeAllUserRefreshTokens(user._id);
  new ApiResponse(200, null, 'Password reset successfully. Please log in with your new password.').send(res);
});

// ---- Refresh / logout ----
const refresh = asyncHandler(async (req, res) => {
  const rawToken = req.cookies[REFRESH_COOKIE_NAME];
  if (!rawToken) throw ApiError.unauthorized('No refresh token provided.');

  let payload, record;
  try {
    ({ payload, record } = await tokenService.verifyRefreshToken(rawToken));
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired refresh token.');
  }
  if (!record) throw ApiError.unauthorized('Refresh token has been revoked.');

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw ApiError.unauthorized('Account no longer active.');

  await tokenService.revokeRefreshToken(rawToken);
  // Carry the original session's "remember me" choice forward — otherwise every silent
  // background refresh would quietly downgrade a remembered session to a session-only cookie.
  const rememberMe = record.rememberMe || false;
  const { accessToken, refreshToken } = await tokenService.issueTokenPair(user, {}, rememberMe);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions(rememberMe));

  new ApiResponse(200, { accessToken, rememberMe }, 'Token refreshed.').send(res);
});

const logout = asyncHandler(async (req, res) => {
  const rawToken = req.cookies[REFRESH_COOKIE_NAME];
  if (rawToken) await tokenService.revokeRefreshToken(rawToken);
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
  new ApiResponse(200, null, 'Logged out.').send(res);
});

// ---- Google OAuth callback (route wraps this after passport.authenticate) ----
const googleCallback = asyncHandler(async (req, res) => {
  const user = req.user; // populated by passport strategy

  try {
    await assertUserCanLogin(user);
  } catch (err) {
    return res.redirect(`${env.clientUrl}/login?error=${encodeURIComponent(err.message)}`);
  }

  user.lastLoginAt = new Date();
  await user.save();

  const { accessToken, refreshToken } = await tokenService.issueTokenPair(user);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
  res.redirect(`${env.clientUrl}/oauth/callback?accessToken=${accessToken}`);
});

const DEMO_ACCOUNT_KEY_BY_ROLE = { customer: 'customer', vendor: 'vendor', delivery_partner: 'deliveryPartner', admin: 'admin' };

// The canonical "Login as Demo X" email for a role — the same account that demo tile logs
// into. Shared by every simulated-Google-login code path below. Delivery Partner is the one
// role with a genuine per-city demo account (see DELIVERY_PARTNERS_BY_CITY) — `cityName` picks
// which city's account to resolve, falling back to Hyderabad (the original single account) if
// omitted or not recognized, so every existing call site that doesn't pass a city still works.
function resolveDemoAccountEmail(role, cityName) {
  if (role === ROLES.DELIVERY_PARTNER) {
    return (DELIVERY_PARTNERS_BY_CITY[cityName] || DELIVERY_PARTNERS_BY_CITY.Hyderabad)?.email || null;
  }
  return DEMO_ACCOUNTS[DEMO_ACCOUNT_KEY_BY_ROLE[role]]?.email || null;
}

// Is `email` ANY of the role's valid canonical demo accounts — for Delivery Partner, any of the
// 4 per-city ones, not just whichever single city a given request happens to mention. Used to
// gate simulated-Google sign-in so it can't be used to log into an arbitrary filler seed account.
function isValidDemoAccountEmail(role, email) {
  if (role === ROLES.DELIVERY_PARTNER) {
    return Object.values(DELIVERY_PARTNERS_BY_CITY).some((a) => a.email === email);
  }
  return DEMO_ACCOUNTS[DEMO_ACCOUNT_KEY_BY_ROLE[role]]?.email === email;
}

// ---- Google OAuth, simulated (Demo Mode only, no real Google credentials configured) ----
// Registered at the exact same `GET /auth/google` path the real flow above uses, and finishes
// through the exact same `${clientUrl}/oauth/callback?accessToken=...` redirect contract, so
// a direct link/bookmark to this URL keeps working exactly as before. The frontend's actual
// "Continue with Google" button no longer uses this route, though — it drives the richer
// listGoogleAccounts/selectGoogleAccount flow below instead (real accounts first, demo only as
// a fallback, with a picker when more than one real account exists) — this GET redirect stays
// as the simpler, always-signs-into-the-canonical-demo-account behavior for anyone hitting the
// URL directly.
const simulateGoogleLogin = asyncHandler(async (req, res) => {
  const email = resolveDemoAccountEmail(req.query.role, req.query.city) || DEMO_ACCOUNTS.customer.email;

  const user = email ? await User.findOne({ email }) : null;
  if (!user) {
    return res.redirect(`${env.clientUrl}/login?error=${encodeURIComponent('Demo Google account is unavailable — please seed the database first.')}`);
  }

  try {
    await assertUserCanLogin(user);
  } catch (err) {
    return res.redirect(`${env.clientUrl}/login?error=${encodeURIComponent(err.message)}`);
  }

  user.lastLoginAt = new Date();
  await user.save();

  const { accessToken, refreshToken } = await tokenService.issueTokenPair(user);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
  res.redirect(`${env.clientUrl}/oauth/callback?accessToken=${accessToken}`);
});

// ---- Google OAuth, simulated: list candidate accounts for a role (Demo Mode only) ----
// Powers the real "Continue with Google" button: real (non-seed) accounts for this role come
// first — never the 25-odd filler seed customers/partners/vendors, which were never meant to be
// login targets at all (see User.isDemoSeed) — with the platform's one canonical demo account
// for the role offered separately as an explicit fallback. The frontend decides what to do with
// this: log straight in if there's exactly one real account, show a picker if there's more than
// one, or fall back to the demo account only if there are zero real ones.
const listGoogleAccounts = asyncHandler(async (req, res) => {
  if (!env.demoMode) throw ApiError.forbidden('Google sign-in simulation is only available in demo mode.');
  const { role, city } = req.query;
  if (!ALL_ROLES.includes(role)) throw ApiError.badRequest('Invalid role.');

  const realAccounts = await User.find({ role, isDemoSeed: false, isActive: true })
    .select('name email')
    .sort({ createdAt: -1 });

  const demoEmail = resolveDemoAccountEmail(role, city);
  const demoUser = demoEmail ? await User.findOne({ email: demoEmail }).select('name email') : null;

  new ApiResponse(200, {
    accounts: realAccounts.map((u) => ({ email: u.email, name: u.name })),
    demoAccount: demoUser ? { email: demoUser.email, name: demoUser.name } : null,
  }).send(res);
});

// ---- Google OAuth, simulated: sign into a specifically-chosen account (Demo Mode only) ----
// No password — simulated Google sign-in stands in for "the user already proved ownership of
// this account to Google," same trust assumption every other branch of this feature makes.
// Restricted to accounts listGoogleAccounts would actually offer (a real, non-seed account of
// this role, or the one canonical demo account) so this can't be used to log into an arbitrary
// filler seed account — and, same as the real password login path, still honors mandatory 2FA
// rather than skipping straight to a full session.
const selectGoogleAccount = asyncHandler(async (req, res) => {
  if (!env.demoMode) throw ApiError.forbidden('Google sign-in simulation is only available in demo mode.');
  const { role, email } = req.body;
  if (!ALL_ROLES.includes(role) || !email) throw ApiError.badRequest('role and email are required.');

  const user = await User.findOne({ email, role }).select('+twoFactor.secret');
  if (!user) throw ApiError.notFound('Account not found.');

  if (user.isDemoSeed && !isValidDemoAccountEmail(role, email)) {
    throw ApiError.forbidden('This account is not available for Google sign-in.');
  }

  await assertUserCanLogin(user);

  if (MANDATORY_2FA_ROLES.includes(user.role) && !user.twoFactor.enabled) {
    const tempToken = generate2FATempToken(user, '2fa_setup');
    return new ApiResponse(200, { requires2FASetup: true, tempToken }, 'Two-factor authentication setup is required for this role.').send(res);
  }

  if (user.twoFactor.enabled) {
    const tempToken = generate2FATempToken(user, '2fa_verify');
    return new ApiResponse(200, { requires2FA: true, tempToken }, 'Enter your two-factor authentication code.').send(res);
  }

  user.lastLoginAt = new Date();
  await user.save();
  await issueSessionAndRespond(res, user, 200, 'Login successful.');
});

module.exports = {
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
  register,
  verifyEmail,
  resendVerificationEmail,
  login,
  login2FAVerify,
  setup2FA,
  enable2FA,
  disable2FA,
  requestPhoneOtp,
  verifyPhoneOtp,
  forgotPassword,
  resetPassword,
  refresh,
  logout,
  googleCallback,
  simulateGoogleLogin,
  listGoogleAccounts,
  selectGoogleAccount,
};
