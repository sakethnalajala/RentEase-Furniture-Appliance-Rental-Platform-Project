const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const passport = require('./config/passport');
const env = require('./config/env');
const { corsOptions } = require('./config/cors');
const { getDbStatus } = require('./config/db');
const routes = require('./routes');
const { apiLimiter } = require('./middlewares/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

const app = express();

// The host's reverse proxy (Render) always sets X-Forwarded-For; without this, express-rate-limit
// throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR on every request in production.
app.set('trust proxy', 1);

// Helmet's default Cross-Origin-Resource-Policy is `same-origin`, which Chromium enforces
// independently of, and in addition to, CORS: even a response carrying a fully correct
// Access-Control-Allow-Origin header still gets blocked client-side if this header says
// same-origin, since this API is deliberately called cross-origin (Vercel frontend -> Render
// backend). Confirmed present on every response from this server's actual default config
// before this fix — a real, separate bug from anything CORS-allowlist-shaped.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Origin allowlist + preflight options live in config/cors.js, shared with Socket.IO.
app.use(cors(corsOptions));
// Belt-and-suspenders: an explicit catch-all OPTIONS handler guarantees every route answers
// preflight the same way, rather than relying only on cors() being mounted early enough to
// intercept every path (true today, but a route-level app.options() elsewhere could otherwise
// shadow it in the future).
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

if (env.nodeEnv !== 'test') {
  app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));
}

// Serves locally-stored uploads when Cloudinary isn't configured (see middlewares/upload.js).
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Every API route except /health answers a readable 503 while MongoDB is unavailable (or the
// startup demo-account bootstrap hasn't finished) — mounted after cors() so the browser can
// actually read it, instead of a request hanging on Mongoose's command buffer and eventually
// failing as a generic 500. The reason comes from describeDbError and never includes secrets.
app.use('/api/v1', (req, res, next) => {
  if (req.path === '/health') return next();
  const { ready, startupComplete, lastError } = getDbStatus();
  if (ready) return next();
  let reason;
  if (startupComplete) reason = 'The API lost its connection to MongoDB and is reconnecting. Please retry shortly.';
  else reason = lastError?.message || 'The API is starting up and connecting to MongoDB. Please retry in a few seconds.';
  return res.status(503).json({ success: false, code: lastError?.code || 'DB_STARTING', message: `Database unavailable: ${reason}` });
});

app.use('/api/v1', apiLimiter, routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
