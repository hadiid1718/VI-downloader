const Queue = require('bull');
const config = require('../config/config');
const DownloadService = require('../services/downloadService');

/* =========================
   Redis + Queue Setup
========================= */

const downloadQueue = new Queue('media-downloads', {
  redis: {
    host: config.redis.host || '127.0.0.1',
    port: config.redis.port || 6379,
    password: config.redis.password || undefined,
    db: config.redis.db || 0,
  },
  settings: {
    stalledInterval: 30000, // check stalled jobs every 30s
    lockDuration: 10 * 60 * 1000, // 10 minutes lock (important for long downloads)
  },
});

/* =========================
   Connection Events
========================= */

downloadQueue.on('error', (error) => {
  console.error(' Queue Connection Error:', error.message);
  console.log('  Make sure Redis (Docker) is running on port 6379');
});

downloadQueue.on('ready', () => {
  console.log(' Queue connected to Redis');
});

/* =========================
   Job Processor
   (This file MUST be run
    as a worker process)
========================= */

downloadQueue.process(5, async (job) => {
  const { url, format } = job.data;
  const downloadId = job.id;

  try {
    job.progress(10);

    // 1️ Extract metadata
    const metadata = await DownloadService.extractMetadata(url);
    if (!metadata.success) {
      throw new Error(metadata.error);
    }

    job.progress(30);

    // 2️ File size check
    const sizeInfo = await DownloadService.getFileSizeEstimate(url, format);
    if (!sizeInfo.canDownload) {
      throw new Error(
        `File too large: ${sizeInfo.estimatedSizeMB}MB (limit ${sizeInfo.maxAllowedMB}MB)`
      );
    }

    job.progress(50);

    // 3️ Download media
    const downloadResult = await DownloadService.downloadMedia(url, format);
    if (!downloadResult.success) {
      throw new Error(downloadResult.error);
    }

    job.progress(100);

    return {
      success: true,
      downloadId,
      url,
      platform: downloadResult.platform,
      format,
      metadata: metadata.metadata,
      completedAt: new Date(),
    };
  } catch (error) {
    // DO NOT reset progress here
    throw error;
  }
});

/* =========================
   Job Events
========================= */

downloadQueue.on('completed', (job) => {
  console.log(`✓ Download completed: ${job.id}`);
});

downloadQueue.on('failed', (job, error) => {
  console.error(`✗ Download failed: ${job.id} - ${error.message}`);
});

downloadQueue.on('stalled', (job) => {
  console.warn(`⚠ Download stalled: ${job.id}`);
});

/* =========================
   Queue Helpers
========================= */

/**
 * Add download job
 */
async function queueDownload(url, format = 'best', options = {}) {
  try {
    const job = await downloadQueue.add(
      { url, format },
      {
        attempts: config.queue.maxAttempts || 3,
        backoff: {
          type: 'exponential',
          delay: config.queue.backoffDelay || 5000,
        },
        timeout: config.download.timeoutMs || 0, //  avoid killing long downloads
        removeOnComplete: true,
        removeOnFail: false,
        ...options,
      }
    );

    return job;
  } catch (error) {
    throw new Error(`Failed to queue download: ${error.message}`);
  }
}

/**
 * Get job status
 */
async function getJobStatus(jobId) {
  try {
    const job = await downloadQueue.getJob(jobId);

    if (!job) {
      return { success: false, error: 'Job not found' };
    }

    return {
      success: true,
      jobId: job.id,
      state: await job.getState(),
      progress: job.progress(),
      attempts: job.attemptsMade,
      failedReason: job.failedReason || null,
      data: job.data,
      result: job.returnvalue || null,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Cancel job
 */
async function cancelDownload(jobId) {
  try {
    const job = await downloadQueue.getJob(jobId);
    if (!job) throw new Error('Job not found');

    await job.remove();
    return { success: true, message: `Download job ${jobId} cancelled` };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Queue stats
 */
async function getQueueStats() {
  try {
    const counts = await downloadQueue.getJobCounts();
    return {
      success: true,
      stats: {
        active: counts.active,
        waiting: counts.waiting,
        completed: counts.completed,
        failed: counts.failed,
        delayed: counts.delayed,
        paused: counts.paused,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  downloadQueue,
  queueDownload,
  getJobStatus,
  cancelDownload,
  getQueueStats,
};
