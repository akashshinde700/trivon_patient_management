/**
 * Comprehensive error handler middleware
 * Provides standardized error responses across the application
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Log error with context
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    method: req.method,
    url: req.url,
    ip: req.ip,
    user: req.user?.id || 'anonymous',
    timestamp: new Date().toISOString()
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Standard error response format
  const errorResponse = {
    success: false,
    error: {
      message: err.message || 'An unexpected error occurred',
      code: err.code || 'INTERNAL_ERROR'
    }
  };

  // Database errors
  if (err.code === 'ER_DUP_ENTRY') {
    errorResponse.error.code = 'DUPLICATE_ENTRY';
    errorResponse.error.message = 'A record with this information already exists';
    return res.status(409).json(errorResponse);
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    errorResponse.error.code = 'INVALID_REFERENCE';
    errorResponse.error.message = 'Referenced record does not exist';
    return res.status(400).json(errorResponse);
  }

  if (err.code === 'ER_BAD_FIELD_ERROR') {
    errorResponse.error.code = 'DATABASE_ERROR';
    errorResponse.error.message = 'Invalid database field';
    return res.status(500).json(errorResponse);
  }

  if (err.code === 'ER_NO_SUCH_TABLE') {
    errorResponse.error.code = 'DATABASE_ERROR';
    errorResponse.error.message = 'Database table not found';
    return res.status(500).json(errorResponse);
  }

  if (err.code === 'ECONNREFUSED') {
    errorResponse.error.code = 'DATABASE_CONNECTION_ERROR';
    errorResponse.error.message = 'Database connection failed';
    return res.status(503).json(errorResponse);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    errorResponse.error.code = 'INVALID_TOKEN';
    errorResponse.error.message = 'Authentication token is invalid';
    return res.status(401).json(errorResponse);
  }

  if (err.name === 'TokenExpiredError') {
    errorResponse.error.code = 'TOKEN_EXPIRED';
    errorResponse.error.message = 'Authentication token has expired. Please login again';
    return res.status(401).json(errorResponse);
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    errorResponse.error.code = 'VALIDATION_ERROR';
    if (err.details) {
      errorResponse.error.details = err.details;
    }
    return res.status(400).json(errorResponse);
  }

  // Unauthorized errors
  if (statusCode === 401) {
    errorResponse.error.code = 'UNAUTHORIZED';
    errorResponse.error.message = err.message || 'Authentication required';
    return res.status(401).json(errorResponse);
  }

  if (statusCode === 403) {
    errorResponse.error.code = 'FORBIDDEN';
    errorResponse.error.message = err.message || 'You do not have permission to access this resource';
    return res.status(403).json(errorResponse);
  }

  // Not found errors
  if (statusCode === 404) {
    errorResponse.error.code = 'NOT_FOUND';
    errorResponse.error.message = err.message || 'The requested resource was not found';
    return res.status(404).json(errorResponse);
  }

  // Rate limit errors
  if (statusCode === 429) {
    errorResponse.error.code = 'RATE_LIMIT_EXCEEDED';
    errorResponse.error.message = err.message || 'Too many requests. Please try again later';
    return res.status(429).json(errorResponse);
  }

  // Include stack trace and additional details only in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
    if (err.details) {
      errorResponse.error.details = err.details;
    }
  }

  // Default error response
  res.status(statusCode).json(errorResponse);
}

/**
 * Create a custom error with status code
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {string} code - Error code
 * @returns {Error} Error object
 */
function createError(message, statusCode = 500, code = 'ERROR') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

module.exports = errorHandler;
module.exports.createError = createError;

