const rateLimit = require('express-rate-limit');
const config = require('../config/config');

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test',
});

/**
 * Strict rate limiter for starting downloads
 * Only limits POST /api/download (starting new downloads)
 */
const downloadStartLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 new downloads per minute
  message: {
    success: false,
    message: 'Too many download requests, please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Allow status checks and other GET requests
    return req.method !== 'POST';
  },
});

/**
 * Lenient rate limiter for status checks
 * Allows frequent polling for download progress
 */
const statusCheckLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // 300 status checks per minute (5 per second)
  message: {
    success: false,
    message: 'Too many status checks, please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Only limit GET requests to status endpoint
    return req.method !== 'GET' || !req.path.includes('/status/');
  },
});

/**
 * Streaming downloads limiter
 * Allow more concurrent streaming downloads
 */
const streamLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100, // 100 stream requests per minute
  message: {
    success: false,
    message: 'Too many streaming requests.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Auth endpoints rate limiter (optional for future use)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  downloadStartLimiter,
  statusCheckLimiter,
  streamLimiter,
  authLimiter,
};
