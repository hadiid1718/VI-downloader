const express = require('express');
const streamController = require('../controller/streamController');

const router = express.Router();

/**
 * @route   POST /api/stream/download
 * @desc    Direct real-time download with progress (SSE)
 * @access  Public
 */
router.post('/stream/download', streamController.directDownload);

/**
 * @route   GET /api/download/file/:filename
 * @desc    Download file to user system
 * @access  Public
 */
router.get('/download/file/:filename', streamController.downloadFile);

/**
 * @route   GET /api/downloads/list
 * @desc    List all downloaded files
 * @access  Public
 */
router.get('/downloads/list', streamController.listDownloads);

/**
 * @route   DELETE /api/downloads/:filename
 * @desc    Delete a downloaded file
 * @access  Public
 */
router.delete('/downloads/:filename', streamController.deleteDownload);

/**
 * @route   POST /api/downloads/cleanup
 * @desc    Cleanup old files
 * @access  Public
 */
router.post('/downloads/cleanup', streamController.cleanupFiles);

module.exports = router;
