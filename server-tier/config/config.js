require('dotenv').config();

const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:5000',
  
  // Database
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/video-downloader',
    dbName: process.env.DB_NAME || 'video-downloader',
  },
  
  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || null,
    db: process.env.REDIS_DB || 0,
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 min
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },
  
  // Download
  download: {
    maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB) || 500,
    timeoutMs: parseInt(process.env.DOWNLOAD_TIMEOUT_MS) || 300000, // 5 min
    tempDir: process.env.TEMP_DOWNLOAD_DIR || './downloads',
  },
  
  // Platform Timeouts
  platformTimeouts: {
    instagram: parseInt(process.env.INSTAGRAM_TIMEOUT) || 30000,
    facebook: parseInt(process.env.FACEBOOK_TIMEOUT) || 30000,
    tiktok: parseInt(process.env.TIKTOK_TIMEOUT) || 30000,
    twitter: parseInt(process.env.TWITTER_TIMEOUT) || 30000,
    pinterest: parseInt(process.env.PINTEREST_TIMEOUT) || 30000,
  },
  
  // Queue
  queue: {
    maxAttempts: parseInt(process.env.QUEUE_MAX_ATTEMPTS) || 3,
    backoffDelay: parseInt(process.env.QUEUE_BACKOFF_DELAY) || 5000,
  },
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // CORS - Allow frontend to communicate with backend
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000,http://localhost:3001').split(',').map(origin => origin.trim()),
};

module.exports = config;
