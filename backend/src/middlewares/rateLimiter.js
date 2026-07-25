const rateLimit = require('express-rate-limit');
const env = require('../config/env');

// Public, read-only catalog browsing (products/categories/cities) is queried dozens of times
// per page — the Browse grid, its 12 curated collection rails, the Dashboard's product rows,
// and per-card wishlist checks all fire independent GET requests. Counting those against the
// same budget as mutations meant the whole app's product data went dark (429s) for the rest
// of the window after a few page loads — the actual cause of the "products take minutes to
// appear" bug. These reads are cheap and side-effect-free, so they're exempt here; writes and
// per-user routes still go through the limiter below.
const PUBLIC_READ_PREFIXES = ['/products', '/categories', '/cities'];

const apiLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  skip: (req) => req.method === 'GET' && PUBLIC_READ_PREFIXES.some((p) => req.path.startsWith(p)),
});

// Tighter limit for brute-force-sensitive auth endpoints (login, OTP request/verify).
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in a few minutes.' },
});

module.exports = { apiLimiter, authLimiter };
