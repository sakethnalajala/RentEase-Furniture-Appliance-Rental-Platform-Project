const env = require('./env');

// One allowlist shared by the REST API (app.js) and Socket.IO (realtime/index.js) — the socket
// server previously allowed only CLIENT_URL, so an unset CLIENT_URL on the host silently blocked
// realtime for the deployed frontend even while REST calls (which had the fallback below) worked.
//
// Static single-string `origin` matching is exact-string-or-nothing — a trailing slash or
// scheme mismatch on either side silently drops the Access-Control-Allow-Origin header with
// no error anywhere, which looks identical to a CORS misconfiguration from the browser's side.
// Normalizing (strip trailing slash) and matching against an explicit allowlist avoids that
// whole class of bug, and separately allows local dev regardless of what CLIENT_URL is set to
// in a given environment. Requests with no Origin header at all (curl, server-to-server, same-
// origin) are never subject to CORS and are always allowed through.
const stripTrailingSlash = (url) => (url || '').replace(/\/+$/, '');

const ALLOWED_ORIGINS = [
  stripTrailingSlash(env.clientUrl),
  'http://localhost:3000',
  // Hardcoded alongside env.clientUrl (not instead of it) — this app's actual production
  // frontend origin, kept here so a misconfigured or missing CLIENT_URL on whichever host runs
  // this process can never be the difference between CORS working and not for the one origin
  // that has to work.
  'https://rentease-furniture-rental-ecru.vercel.app',
].filter(Boolean);

const isAllowedOrigin = (origin) => !origin || ALLOWED_ORIGINS.includes(stripTrailingSlash(origin));

// Explicit methods/allowedHeaders, not left to the `cors` package's defaults — this app's own
// login/checkout/upload flows use PATCH and DELETE alongside GET/POST/PUT, and send both
// Content-Type and Authorization, so every one of those needs to be in the preflight response's
// Access-Control-Allow-Methods/-Headers or the browser cancels the real request after a
// "successful" (2xx) but incomplete preflight — indistinguishable from a hard network failure
// from the frontend's side, and invisible in server logs either way, since the `cors` middleware
// answers OPTIONS requests itself before they ever reach the logging middleware.
const corsOptions = {
  origin(origin, callback) {
    // `callback(null, false)`, not an Error — an unrecognized origin is a routine access-
    // control decision (just omit the CORS header so the browser blocks it client-side), not
    // a server error; erroring here would incorrectly surface as a 500 through errorHandler.
    callback(null, isAllowedOrigin(origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-cleanup-secret', 'x-seed-secret'],
};

module.exports = { ALLOWED_ORIGINS, isAllowedOrigin, corsOptions };
