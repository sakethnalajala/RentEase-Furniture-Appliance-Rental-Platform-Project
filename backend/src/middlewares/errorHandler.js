const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const env = require('../config/env');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let error = err;

  if (!(error instanceof ApiError)) {
    if (error.name === 'ValidationError') {
      // Mongoose schema validation error
      const details = Object.values(error.errors).map((e) => e.message);
      error = ApiError.badRequest('Validation failed.', details);
    } else if (error.code === 11000) {
      const field = Object.keys(error.keyValue || {})[0] || 'field';
      error = ApiError.conflict(`${field} already exists.`);
    } else if (error.name === 'CastError') {
      error = ApiError.badRequest(`Invalid ${error.path}: ${error.value}`);
    } else if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      error = ApiError.unauthorized('Invalid or expired token.');
    } else {
      const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
      error = new ApiError(statusCode, error.message || 'Internal server error.');
    }
  }

  if (error.statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} -> ${error.message}\n${err.stack || ''}`);
  }

  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    details: error.details || undefined,
    stack: env.nodeEnv === 'development' ? err.stack : undefined,
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, notFoundHandler };
