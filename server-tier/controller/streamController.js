const path = require('path');
const fs = require('fs');
const PlatformDetector = require('../services/platformDetector');
const DownloadService = require('../services/downloadService');
const StreamDownloadService = require('../services/streamDownloadService');
const { validate, downloadSchema, metadataSchema } = require('../utils/validation');
const { DownloadError, asyncHandler } = require('../utils/errors');
const Logger = require('../utils/logger');

const logger = new Logger('info');

/**
 * Start real-time download (direct to user browser)
 * Uses Server-Sent Events (SSE) for progress tracking
 */
exports.directDownload = asyncHandler(async (req, res) => {
  const { url, format } = req.body;

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
      message: 'Invalid URL or unsupported platform',
    });
  }

  try {
    // Verify URL can be downloaded
    const checkResult = await DownloadService.canDownload(url);
    if (!checkResult.canDownload) {
      throw new DownloadError(
        `URL cannot be downloaded: ${checkResult.reason}`,
        422
      );
    }

    // Check file size
    const sizeInfo = await DownloadService.getFileSizeEstimate(url, format);
    if (!sizeInfo.canDownload) {
      return res.status(422).json({
        success: false,
        message: `File too large: ${sizeInfo.estimatedSizeMB}MB exceeds limit of ${sizeInfo.maxAllowedMB}MB`,
      });
    }

    logger.info('Direct download started', {
      url,
      platform: detection.platform,
      format,
    });

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Send initial message
    res.write(`data: ${JSON.stringify({ status: 'starting', progress: 0 })}\n\n`);

    // Start download with progress tracking
    const downloadResult = await StreamDownloadService.downloadMediaRealtime(
      url,
      format,
      (progress) => {
        // Send progress updates
        res.write(`data: ${JSON.stringify(progress)}\n\n`);
      }
    );

    if (!downloadResult.success) {
      throw new DownloadError(downloadResult.error || 'Download failed');
    }

    // Send completion message with file info
    res.write(
      `data: ${JSON.stringify({
        status: 'completed',
        progress: 100,
        message: 'Download completed',
        file: downloadResult.file,
        filePath: downloadResult.filePath,
        fileSizeMB: downloadResult.fileSizeMB,
        downloadUrl: `/api/download/file/${downloadResult.file}`,
      })}\n\n`
    );

    logger.info('Direct download completed', {
      file: downloadResult.file,
      size: downloadResult.fileSizeMB,
    });

    res.end();
  } catch (error) {
    logger.error('Direct download failed', {
      url,
      error: error.message,
    });

    res.write(
      `data: ${JSON.stringify({
        status: 'error',
        error: error.message,
      })}\n\n`
    );
    res.end();
  }
});

/**
 * Download file directly to user's system
 */
exports.downloadFile = asyncHandler(async (req, res) => {
  const { filename } = req.params;

  try {
    const fileInfo = StreamDownloadService.getFile(filename);

    if (!fileInfo.success) {
      return res.status(404).json({
        success: false,
        message: fileInfo.error,
      });
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileInfo.filename}"`
    );
    res.setHeader('Content-Length', fileInfo.fileSize);

    logger.info('File download started', {
      filename,
      size: fileInfo.fileSizeMB,
    });

    // Stream file to client
    const fileStream = fs.createReadStream(fileInfo.filePath);

    fileStream.on('end', () => {
      logger.info('File download completed', { filename });
    });

    fileStream.on('error', (error) => {
      logger.error('File download error', {
        filename,
        error: error.message,
      });
      res.status(500).json({
        success: false,
        message: 'Error reading file',
      });
    });

    fileStream.pipe(res);
  } catch (error) {
    logger.error('Download file request error', {
      filename: req.params.filename,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Error processing download',
      error: error.message,
    });
  }
});

/**
 * Get list of available downloads
 */
exports.listDownloads = asyncHandler(async (req, res) => {
  try {
    const result = StreamDownloadService.listFiles();

    if (!result.success) {
      throw new Error(result.error);
    }

    res.json({
      success: true,
      files: result.files,
      totalFiles: result.files.length,
    });
  } catch (error) {
    logger.error('List downloads error', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to list downloads',
      error: error.message,
    });
  }
});

/**
 * Delete a downloaded file
 */
exports.deleteDownload = asyncHandler(async (req, res) => {
  const { filename } = req.params;

  try {
    const result = StreamDownloadService.deleteFile(filename);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error,
      });
    }

    logger.info('File deleted', { filename });

    res.json({
      success: true,
      message: `File ${filename} deleted`,
    });
  } catch (error) {
    logger.error('Delete download error', {
      filename,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to delete file',
      error: error.message,
    });
  }
});

/**
 * Cleanup old files
 */
exports.cleanupFiles = asyncHandler(async (req, res) => {
  const { hoursOld } = req.query;

  try {
    const result = StreamDownloadService.cleanupOldFiles(parseInt(hoursOld) || 24);

    if (!result.success) {
      throw new Error(result.error);
    }

    logger.info('Cleanup completed', {
      deletedCount: result.deletedCount,
    });

    res.json({
      success: true,
      message: `${result.deletedCount} old files deleted`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    logger.error('Cleanup error', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Cleanup failed',
      error: error.message,
    });
  }
});

module.exports = {
  directDownload: exports.directDownload,
  downloadFile: exports.downloadFile,
  listDownloads: exports.listDownloads,
  deleteDownload: exports.deleteDownload,
  cleanupFiles: exports.cleanupFiles,
};
