const express = require('express');
const downloadController = require('../controller/downloadController');

const router = express.Router();

/**
 * @route   POST /api/detect
 * @desc    Detect platform from URL
 * @access  Public
 */
router.post('/detect', downloadController.detectPlatform);

/**
 * @route   POST /api/metadata
 * @desc    Get media metadata
 * @access  Public
 */
router.post('/metadata', downloadController.getMetadata);

/**
 * @route   POST /api/formats
 * @desc    Get available formats
 * @access  Public
 */
router.post('/formats', downloadController.getFormats);

/**
 * @route   POST /api/check
 * @desc    Check if URL can be downloaded
 * @access  Public
 */
router.post('/check', downloadController.checkDownloadability);

/**
 * @route   POST /api/filesize
 * @desc    Get file size estimate
 * @access  Public
 */
router.post('/filesize', downloadController.getFileSize);

/**
 * @route   POST /api/download
 * @desc    Start download (queue it)
 * @access  Public
 */
router.post('/download', downloadController.startDownload);

/**
 * @route   GET /api/download/status/:jobId
 * @desc    Get download job status
 * @access  Public
 */
router.get('/download/status/:jobId', downloadController.getDownloadStatus);

/**
 * @route   DELETE /api/download/:jobId
 * @desc    Cancel download job
 * @access  Public
 */
router.delete('/download/:jobId', downloadController.cancelDownload);

/**
 * @route   GET /api/download/cancel/:jobId
 * @desc    Cancel download job (alternative GET method)
 * @access  Public
 */
router.get('/download/cancel/:jobId', downloadController.cancelDownload);

/**
 * @route   GET /api/queue/stats
 * @desc    Get queue statistics
 * @access  Public
 */
router.get('/queue/stats', downloadController.getQueueStats);

/**
 * @route   GET /api/health
 * @desc    Health check
 * @access  Public
 */
router.get('/health', downloadController.healthCheck);

module.exports = router;
