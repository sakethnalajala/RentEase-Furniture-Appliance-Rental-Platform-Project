const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    userAgent: { type: String, default: '' },
    ip: { type: String, default: '' },
    isRevoked: { type: Boolean, default: false },
    // Whether the session this token belongs to should survive a full browser close (persistent
    // cookie) or not (session-only cookie) — carried forward on every /auth/refresh rotation so
    // a "Remember me" choice made at login stays honored for the lifetime of that session.
    rememberMe: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// TTL index: Mongo auto-deletes the document once expiresAt passes.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ user: 1 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
