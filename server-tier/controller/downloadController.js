const { v4: uuidv4 } = require('uuid');
const PlatformDetector = require('../services/platformDetector');
const DownloadService = require('../services/downloadService');
const SimpleDownloadService = require('../services/simpleDownloadService');
const { queueDownload, getJobStatus, cancelDownload, getQueueStats } = require('../queue/downloadQueue');
const { validate, downloadSchema, metadataSchema, jobStatusSchema } = require('../utils/validation');
const { DownloadError, PlatformError, asyncHandler } = require('../utils/errors');
const Logger = require('../utils/logger');

const logger = new Logger('info');

/**
 * Detect platform from URL
 */
exports.detectPlatform = asyncHandler(async (req, res) => {
  const { url } = req.body || {};

  if (!url) {
    return res.status(400).json({
      success: false,
      message: 'URL is required',
    });
  }

  const detection = PlatformDetector.detectPlatform(url);

  if (!detection.isValid) {
    return res.status(400).json({
      success: false,
      message: detection.error || 'Invalid URL or unsupported platform',
    });
  }

  res.json({
    success: true,
    platform: detection.platform,
    mediaType: detection.mediaType,
  });
});

/**
 * Get media metadata
 */
exports.getMetadata = asyncHandler(async (req, res) => {
  const validation = validate(req.body, metadataSchema);

  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      errors: validation.errors,
    });
  }

  const { url } = validation.data;
  const detection = PlatformDetector.detectPlatform(url);

  if (!detection.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Invalid URL or unsupported platform',
    });
  }

  try {
    const result = await SimpleDownloadService.extractMetadata(url);

    if (!result.success) {
      throw new DownloadError(result.error || 'Failed to extract metadata');
    }

    res.json({
      success: true,
      metadata: result.metadata,
    });
  } catch (error) {
    logger.error('Metadata extraction failed', {
      url,
      platform: detection.platform,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to extract metadata',
      error: error.message,
    });
  }
});

/**
 * Get available formats
 */
exports.getFormats = asyncHandler(async (req, res) => {
  const validation = validate(req.body || {}, metadataSchema);

  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      errors: validation.errors,
    });
  }

  const { url } = validation.data;

  const detection = PlatformDetector.detectPlatform(url);

  if (!detection.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Invalid URL or unsupported platform',
    });
  }

  try {
    const result = await SimpleDownloadService.getFormats(url);

    if (!result.success) {
      throw new DownloadError(result.error);
    }

    res.json({
      success: true,
      formats: result.formats,
    });
  } catch (error) {
    logger.error('Format extraction failed', {
      url,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get formats',
      error: error.message,
    });
  }
});

/**
 * Check if URL can be downloaded
 */
exports.checkDownloadability = asyncHandler(async (req, res) => {
  const validation = validate(req.body || {}, metadataSchema);

  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      errors: validation.errors,
    });
  }

  const { url } = validation.data;

  try {
    const result = await SimpleDownloadService.canDownload(url);

    res.json({
      success: true,
      canDownload: result.canDownload,
      platform: result.platform,
      reason: result.reason,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Download check failed',
      error: error.message,
    });
  }
});

/**
 * Get file size estimate
 */
exports.getFileSize = asyncHandler(async (req, res) => {
  const validation = validate(req.body || {}, downloadSchema);

  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      errors: validation.errors,
    });
  }

  const { url, format } = validation.data;

  try {
    const result = await SimpleDownloadService.getFileSizeEstimate(url, format);

    if (!result.success) {
      throw new DownloadError(result.error);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to estimate file size',
      error: error.message,
    });
  }
});

/**
 * Start media download (queue it)
 */
exports.startDownload = asyncHandler(async (req, res) => {
  const validation = validate(req.body, downloadSchema);

  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      errors: validation.errors,
    });
  }

  const { url, format, priority } = validation.data;
  const detection = PlatformDetector.detectPlatform(url);

  if (!detection.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Invalid URL or unsupported platform',
    });
  }

  try {
    // Verify URL can be downloaded
    const checkResult = await SimpleDownloadService.canDownload(url);
    if (!checkResult.canDownload) {
      throw new DownloadError(
        `URL cannot be downloaded: ${checkResult.reason}`,
        422
      );
    }

    // Queue the download
    const jobOptions = {};
    if (priority === 'high') {
      jobOptions.priority = 1;
    } else if (priority === 'low') {
      jobOptions.priority = 10;
    } else {
      jobOptions.priority = 5;
    }

    const job = await queueDownload(url, format, jobOptions);

    logger.info('Download queued', {
      jobId: job.id,
      url,
      platform: detection.platform,
      format,
    });

    res.status(202).json({
      success: true,
      message: 'Download queued successfully',
      jobId: job.id,
      platform: detection.platform,
      statusUrl: `/api/download/status/${job.id}`,
    });
  } catch (error) {
    logger.error('Download queue failed', {
      url,
      error: error.message,
    });

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to queue download',
    });
  }
});

/**
 * Get download job status
 */
exports.getDownloadStatus = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  if (!jobId) {
    return res.status(400).json({
      success: false,
      message: 'Job ID is required',
    });
  }

  try {
    const result = await getJobStatus(jobId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      job: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get job status',
      error: error.message,
    });
  }
});

/**
 * Cancel download job
 */
exports.cancelDownload = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  if (!jobId) {
    return res.status(400).json({
      success: false,
      message: 'Job ID is required',
    });
  }

  try {
    const result = await cancelDownload(jobId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error,
      });
    }

    logger.info('Download cancelled', { jobId });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to cancel download',
      error: error.message,
    });
  }
});

/**
 * Get queue statistics
 */
exports.getQueueStats = asyncHandler(async (req, res) => {
  try {
    const result = await getQueueStats();

    if (!result.success) {
      throw new Error(result.error);
    }

    res.json({
      success: true,
      queue: result.stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get queue statistics',
      error: error.message,
    });
  }
});

/**
 * Health check endpoint
 */
exports.healthCheck = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date(),
  });
});
