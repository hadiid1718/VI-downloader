const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');
const PlatformDetector = require('./platformDetector');
const { getPlatformOptions } = require('./platformHeaders');
const FFmpegHelper = require('../utils/ffmpegHelper');

class StreamDownloadService {
  /**
   * Download media with real-time streaming
   * @param {string} url - Media URL
   * @param {string} format - Format ID
   * @param {function} onProgress - Progress callback
   * @returns {Promise<object>} Download result with file info
   */
  static async downloadMediaRealtime(url, format = 'best', onProgress = null) {
    return new Promise((resolve, reject) => {
      try {
        const { platform } = PlatformDetector.detectPlatform(url);
        const timeout = PlatformDetector.getPlatformTimeout(platform);
        const platformOptions = getPlatformOptions(platform);

        // Create downloads directory if it doesn't exist
        if (!fs.existsSync(config.download.tempDir)) {
          fs.mkdirSync(config.download.tempDir, { recursive: true });
        }

        // Output template for downloaded file
        const outputTemplate = path.join(
          config.download.tempDir,
          `%(title)s.%(ext)s`
        );

        // For Instagram, download best video with audio merged
        // Instagram separates video and audio into different streams
        let ytdlpFormat = format;
        let isInstagram = false;
        if (platform.toLowerCase() === 'instagram') {
          // Force ONLY bestvideo+bestaudio combination - no fallback options
          // This prevents any fallback to audio-only M4A
          ytdlpFormat = 'bestvideo+bestaudio/best';
          isInstagram = true;
        }

        // Build yt-dlp command with platform-specific options
        const args = [
          '-f', ytdlpFormat,
          '--no-warnings',
          '--socket-timeout', platformOptions.socketTimeout.toString(),
          '--user-agent', platformOptions.userAgent,
          '--no-check-certificate',
          '--retries', platformOptions.retries.toString(),
          '--fragment-retries', platformOptions.fragmentRetries.toString(),
        ];

        // For Instagram, add authentication and ensure MP4 output
        if (isInstagram) {
          // Try to get cookies from browser, but don't fail if not available
          try {
            args.push('--cookies-from-browser');
            args.push('chrome');
          } catch (e) {
            // Continue without cookies if browser access fails
            console.warn('Could not access browser cookies:', e.message);
          }
          
          // Add more retries for Instagram rate limiting
          args.push('--socket-timeout');
          args.push('60');
          args.push('--retries');
          args.push('10');
          
          // Force output format
          args.push('--merge-output-format');
          args.push('mp4');
        }

        // Add skip unavailable fragments for platforms that support it
        if (platformOptions.skipUnavailableFragments) {
          args.push('--skip-unavailable-fragments');
        }

        args.push('-o', outputTemplate);
        args.push('--progress');
        args.push('--newline');
        args.push(url);

        // Spawn yt-dlp process
        const ytdlp = spawn('yt-dlp', args);
        let lastProgress = 0;
        let downloadedFile = null;
        let errorMessages = [];

        // Handle stdout for progress tracking
        ytdlp.stdout.on('data', (data) => {
          const output = data.toString();
          
          // Extract progress percentage
          const progressMatch = output.match(/(\d+\.?\d*)\%/);
          if (progressMatch) {
            const progress = Math.min(100, Math.round(parseFloat(progressMatch[1])));
            if (progress > lastProgress) {
              lastProgress = progress;
              if (onProgress) {
                onProgress({
                  progress,
                  status: 'downloading',
                  message: `Downloading: ${progress}%`,
                });
              }
            }
          }

          // Extract filename
          const fileMatch = output.match(/\[download\].*?"(.*?)"/);
          if (fileMatch) {
            downloadedFile = fileMatch[1];
          }
        });

        // Handle stderr
        ytdlp.stderr.on('data', (data) => {
          const error = data.toString();
          console.error('yt-dlp stderr:', error);
          errorMessages.push(error);
        });

        // Handle process completion
        ytdlp.on('close', (code) => {
          if (code === 0) {
            // Find the downloaded file
            const files = fs.readdirSync(config.download.tempDir);
            const newestFile = files
              .map((f) => ({
                name: f,
                time: fs.statSync(path.join(config.download.tempDir, f)).mtime.getTime(),
              }))
              .sort((a, b) => b.time - a.time)[0];

            if (newestFile) {
              const filePath = path.join(config.download.tempDir, newestFile.name);
              const fileSize = fs.statSync(filePath).size;

              resolve({
                success: true,
                message: 'Download completed',
                platform,
                file: newestFile.name,
                filePath,
                fileSize,
                fileSizeMB: (fileSize / (1024 * 1024)).toFixed(2),
              });
            } else {
              reject(new Error('File not found after download'));
            }
          } else {
            // Build error message from collected stderr messages
            const detailedError = errorMessages.length > 0 
              ? errorMessages.join('\n') 
              : `yt-dlp exited with code ${code}`;
            
            console.error('Download failed with details:', detailedError);
            reject(new Error(`Download failed: ${detailedError.substring(0, 200)}`));
          }
        });

        // Handle process errors
        ytdlp.on('error', (error) => {
          reject(new Error(`Failed to spawn yt-dlp: ${error.message}`));
        });

        // Set timeout
        setTimeout(() => {
          ytdlp.kill();
          reject(new Error('Download timeout exceeded'));
        }, timeout);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get file from downloads directory
   * @param {string} filename - File name
   * @returns {object} File info
   */
  static getFile(filename) {
    try {
      // Prevent directory traversal
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        throw new Error('Invalid filename');
      }

      const filePath = path.join(config.download.tempDir, filename);

      // Verify file exists
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: 'File not found',
        };
      }

      const stats = fs.statSync(filePath);

      return {
        success: true,
        filePath,
        filename,
        fileSize: stats.size,
        fileSizeMB: (stats.size / (1024 * 1024)).toFixed(2),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete downloaded file
   * @param {string} filename - File name
   * @returns {boolean} Success status
   */
  static deleteFile(filename) {
    try {
      // Prevent directory traversal
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        throw new Error('Invalid filename');
      }

      const filePath = path.join(config.download.tempDir, filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return {
          success: true,
          message: 'File deleted',
        };
      }

      return {
        success: false,
        error: 'File not found',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * List all downloaded files
   * @returns {array} List of files
   */
  static listFiles() {
    try {
      if (!fs.existsSync(config.download.tempDir)) {
        return {
          success: true,
          files: [],
        };
      }

      const files = fs.readdirSync(config.download.tempDir);
      const fileList = files.map((filename) => {
        const filePath = path.join(config.download.tempDir, filename);
        const stats = fs.statSync(filePath);

        return {
          filename,
          fileSize: stats.size,
          fileSizeMB: (stats.size / (1024 * 1024)).toFixed(2),
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
        };
      });

      return {
        success: true,
        files: fileList,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Clean up old files (older than 24 hours)
   * @returns {object} Cleanup result
   */
  static cleanupOldFiles(hoursOld = 24) {
    try {
      if (!fs.existsSync(config.download.tempDir)) {
        return {
          success: true,
          deletedCount: 0,
        };
      }

      const files = fs.readdirSync(config.download.tempDir);
      const now = Date.now();
      const maxAge = hoursOld * 60 * 60 * 1000;
      let deletedCount = 0;

      files.forEach((filename) => {
        const filePath = path.join(config.download.tempDir, filename);
        const stats = fs.statSync(filePath);
        const age = now - stats.mtime.getTime();

        if (age > maxAge) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      });

      return {
        success: true,
        deletedCount,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = StreamDownloadService;
