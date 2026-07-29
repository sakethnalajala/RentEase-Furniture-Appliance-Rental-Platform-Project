const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const passport = require('./config/passport');
const env = require('./config/env');
const routes = require('./routes');
const { apiLimiter } = require('./middlewares/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

const app = express();

// Vercel's edge proxy always sets X-Forwarded-For; without this, express-rate-limit
// throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR on every request in production.
app.set('trust proxy', 1);

// Helmet's default Cross-Origin-Resource-Policy is `same-origin`, which Chromium enforces
// independently of, and in addition to, CORS: even a response carrying a fully correct
// Access-Control-Allow-Origin header still gets blocked client-side if this header says
// same-origin, since this API is deliberately called cross-origin (Vercel frontend -> Render
// backend). Confirmed present on every response from this server's actual default config
// before this fix — a real, separate bug from anything CORS-allowlist-shaped.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

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

app.use(
  cors({
    origin(origin, callback) {
      // `callback(null, false)`, not an Error — an unrecognized origin is a routine access-
      // control decision (just omit the CORS header so the browser blocks it client-side), not
      // a server error; erroring here would incorrectly surface as a 500 through errorHandler.
      callback(null, !origin || ALLOWED_ORIGINS.includes(stripTrailingSlash(origin)));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

if (env.nodeEnv !== 'test') {
  app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));
}

// Serves locally-stored uploads when Cloudinary isn't configured (see middlewares/upload.js).
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/v1', apiLimiter, routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
