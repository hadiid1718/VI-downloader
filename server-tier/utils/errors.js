/**
 * Custom error classes for better error handling
 */

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.timestamp = new Date();
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests', retryAfter = 60) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.retryAfter = retryAfter;
  }
}

class DownloadError extends AppError {
  constructor(message, statusCode = 422) {
    super(message, statusCode, 'DOWNLOAD_ERROR');
  }
}

class PlatformError extends AppError {
  constructor(platform, message, statusCode = 503) {
    super(`${platform} error: ${message}`, statusCode, 'PLATFORM_ERROR');
    this.platform = platform;
  }
}

/**
 * Express error handler middleware
 */
function errorHandler(err, req, res, next) {
  console.error('Error:', {
    message: err.message,
    code: err.code,
    stack: err.stack,
    url: req.originalUrl,
  });

  // Default error response
  let status = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Internal server error';
  let errors = err.errors || [];

  // Handle specific error types
  if (err instanceof ValidationError) {
    return res.status(status).json({
      success: false,
      code,
      message,
      errors,
    });
  }

  if (err instanceof RateLimitError) {
    return res.status(status).set('Retry-After', err.retryAfter).json({
      success: false,
      code,
      message,
      retryAfter: err.retryAfter,
    });
  }

  // Generic error response
  res.status(status).json({
    success: false,
    code,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * Async error wrapper for Express route handlers
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
  DownloadError,
  PlatformError,
  errorHandler,
  asyncHandler,
};
