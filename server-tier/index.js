require('dotenv').config();

const express = require('express');
const cors = require('cors');
const config = require('./config/config');
const downloadRoutes = require('./routes/downloadRoutes');
const { apiLimiter, downloadStartLimiter, statusCheckLimiter } = require('./middleware/rateLimiter');
const { errorHandler, asyncHandler } = require('./utils/errors');
const Logger = require('./utils/logger');

const app = express();
const logger = new Logger(config.logLevel);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Ensure req.body is always defined
app.use((req, res, next) => {
  if (!req.body) {
    req.body = {};
  }
  next();
});

// CORS Configuration
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info(`${req.method} ${req.path}`, {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });

  next();
});

// Apply specific limiters FIRST (before general limiter)
app.use('/api/download/status', statusCheckLimiter); // Lenient for status checks (300/min)
app.use('/api/download/cancel', statusCheckLimiter); // Lenient for cancel requests
app.use('/api/download', downloadStartLimiter);      // Moderate for new downloads (20/min)

// Apply general rate limiter to all /api routes LAST
app.use('/api/', apiLimiter);

// Health check (before other routes to skip rate limiting in some cases)
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date(),
  });
});

// API Routes
app.use('/api', downloadRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = config.port;
const server = app.listen(PORT, () => {
  logger.info(`🚀 Server started successfully`, {
    port: PORT,
    environment: config.nodeEnv,
    corsOrigin: config.corsOrigin.join(', '),
  });
  
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║   📥 MEDIA DOWNLOADER SERVER STARTED                  ║');
  console.log(`║   🔗 API running at: http://localhost:${PORT}           ║`);
  console.log('║   ✓ Frontend connects at: http://localhost:5173      ║');
  console.log('║   ⚠️  Note: Requires Redis and yt-dlp                 ║');
  console.log('║   📖 See SETUP.md for installation instructions      ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.warn('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.warn('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Handle unhandled exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    message: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason,
    promise,
  });
});

module.exports = app;
