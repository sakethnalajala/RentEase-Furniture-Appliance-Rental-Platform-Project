const mongoose = require('mongoose');
const { ALL_ROLES, ROLES } = require('../constants/roles');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, unique: true, sparse: true, trim: true },
    passwordHash: { type: String, select: false },
    role: { type: String, enum: ALL_ROLES, default: ROLES.CUSTOMER, required: true },

    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    googleId: { type: String, unique: true, sparse: true },

    avatar: { type: String, default: '' },
    // Profile hero background — currently only surfaced on the Admin Profile page, but kept on
    // the base User (not Admin-specific) since any role could reasonably want one later.
    coverImage: { type: String, default: '' },

    isEmailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },

    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    twoFactor: {
      enabled: { type: Boolean, default: false },
      secret: { type: String, select: false },
      mandatory: { type: Boolean, default: false },
    },

    selectedCity: { type: mongoose.Schema.Types.ObjectId, ref: 'City', default: null },

    kyc: {
      status: { type: String, enum: ['not_submitted', 'pending', 'verified', 'rejected'], default: 'not_submitted' },
      documents: [{ type: { type: String }, url: String, uploadedAt: Date }],
    },

    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },

    // True only for accounts seed.js creates (demo tiles, filler customers/partners/vendors,
    // sample vendor applications). Lets features that need to distinguish "an account a real
    // user actually created" from "seed/demo data" do so precisely — e.g. the simulated Google
    // sign-in account picker (see auth.controller.js's listGoogleAccounts) must never list the
    // 25 filler demo customers as if they were real registered accounts.
    isDemoSeed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });
userSchema.index({ role: 1, isDemoSeed: 1 });

module.exports = mongoose.model('User', userSchema);
