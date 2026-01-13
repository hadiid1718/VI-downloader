const { exec } = require('child_process');
const { promisify } = require('util');
const axios = require('axios');
const config = require('../config/config');
const PlatformDetector = require('./platformDetector');
const { buildYtDlpCommand, buildDownloadCommand } = require('./platformHeaders');
const InstagramHandler = require('./instagramHandler');

const execAsync = promisify(exec);

class DownloadService {
  /**
   * Retry logic for flaky network requests
   * @param {function} fn - Async function to retry
   * @param {number} maxRetries - Max retry attempts
   * @param {number} delayMs - Delay between retries
   * @returns {Promise<any>} Function result
   */
  static async retryWithBackoff(fn, maxRetries = 3, delayMs = 2000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          const delay = delayMs * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms. Error: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Extract media metadata using yt-dlp with proper headers
   * @param {string} url - Media URL
   * @returns {Promise<object>} Media metadata
   */
  static async extractMetadata(url) {
    try {
      const { platform } = PlatformDetector.detectPlatform(url);
      
      // Use Instagram-specific handler for Instagram URLs
      if (platform.toLowerCase() === 'instagram') {
        const instagramResult = await InstagramHandler.getMetadata(url);
        
        if (!instagramResult.success) {
          return {
            success: false,
            error: instagramResult.error || instagramResult.message || 'Failed to extract Instagram metadata',
          };
        }

        const metadata = instagramResult.metadata;
        
        // Extract thumbnail safely
        let thumbnail = metadata.thumbnail || null;
        if (metadata.thumbnails && metadata.thumbnails.length > 0) {
          thumbnail = metadata.thumbnails[metadata.thumbnails.length - 1].url;
        }

        // Build formats array
        let formats = [];
        if (metadata.formats && metadata.formats.length > 0) {
          formats = metadata.formats
            .filter(fmt => fmt && (fmt.ext || fmt.format_id))
            .map((fmt) => ({
              formatId: fmt.format_id || fmt.ext || 'unknown',
              extension: fmt.ext || 'mp4',
              resolution: (fmt.height && fmt.width) ? `${fmt.height}p` : (fmt.format || 'unknown'),
              filesize: fmt.filesize || fmt.size || 0,
              fps: fmt.fps || null,
              vcodec: fmt.vcodec || null,
              acodec: fmt.acodec || null,
            }))
            .sort((a, b) => b.filesize - a.filesize);
        }

        return {
          success: true,
          metadata: {
            title: metadata.title || 'Unknown',
            duration: metadata.duration || 0,
            uploader: metadata.uploader || metadata.channel || 'Unknown',
            uploadDate: metadata.upload_date || null,
            thumbnail: thumbnail,
            formats: formats,
            platform,
          },
        };
      }
      
      // Use retry logic for other platforms
      const metadata = await this.retryWithBackoff(async () => {
        // Build yt-dlp command with platform-specific headers
        const command = buildYtDlpCommand(url, platform, true);

        const { stdout, stderr } = await execAsync(command, {
          timeout: 60000,
          maxBuffer: 20 * 1024 * 1024, // 20MB buffer for large metadata
        });

        if (!stdout) {
          throw new Error(`Failed to extract metadata: ${stderr || 'Unknown error'}`);
        }

        return JSON.parse(stdout);
      }, 3, 3000); // 3 retries with 3 second initial delay

      // Extract thumbnail safely
      let thumbnail = metadata.thumbnail || null;
      if (metadata.thumbnails && metadata.thumbnails.length > 0) {
        thumbnail = metadata.thumbnails[metadata.thumbnails.length - 1].url;
      }

      // Build formats array with fallback values
      let formats = [];
      if (metadata.formats && metadata.formats.length > 0) {
        formats = metadata.formats
          .filter(fmt => fmt && (fmt.ext || fmt.format_id))
          .map((fmt) => ({
            formatId: fmt.format_id || fmt.ext || 'unknown',
            extension: fmt.ext || 'mp4',
            resolution: (fmt.height && fmt.width) ? `${fmt.height}p` : (fmt.format || 'unknown'),
            filesize: fmt.filesize || fmt.size || 0,
            fps: fmt.fps || null,
            vcodec: fmt.vcodec || null,
            acodec: fmt.acodec || null,
          }))
          .sort((a, b) => b.filesize - a.filesize);
      }

      return {
        success: true,
        metadata: {
          title: metadata.title || 'Unknown',
          duration: metadata.duration || 0,
          uploader: metadata.uploader || metadata.channel || 'Unknown',
          uploadDate: metadata.upload_date || null,
          thumbnail: thumbnail,
          formats: formats,
          platform,
        },
      };
    } catch (error) {
      // Log detailed error for debugging
      console.error(`Metadata extraction failed for platform ${error.message}`);
      
      return {
        success: false,
        error: `Failed to extract metadata: ${error.message}. Instagram and other platforms may require additional authentication or have rate limiting enabled.`,
      };
    }
  }

  /**
   * Download media using yt-dlp
   * @param {string} url - Media URL
   * @param {string} format - Format ID (optional)
   * @returns {Promise<object>} Download result
   */
  static async downloadMedia(url, format = 'best') {
    try {
      const { platform } = PlatformDetector.detectPlatform(url);

      // Use retry logic for download
      await this.retryWithBackoff(async () => {
        // Build yt-dlp command with platform-specific headers
        const outputTemplate = `${config.download.tempDir}/%(title)s.%(ext)s`;
        const command = buildDownloadCommand(url, platform, format, outputTemplate);

        const { stdout, stderr } = await execAsync(command, {
          timeout: 120000,
          maxBuffer: 10 * 1024 * 1024,
        });

        if (!stdout && stderr && stderr.includes('ERROR')) {
          throw new Error(stderr);
        }
      }, 2, 2000); // 2 retries for downloads

      return {
        success: true,
        message: 'Download completed',
        platform,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Download failed',
      };
    }
  }

  /**
   * Get available formats for media
   * @param {string} url - Media URL
   * @returns {Promise<array>} List of formats
   */
  static async getFormats(url) {
    try {
      const result = await this.extractMetadata(url);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      return {
        success: true,
        formats: result.metadata.formats,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Validate if URL can be downloaded
   * @param {string} url - Media URL
   * @returns {Promise<boolean>} Can download or not
   */
  static async canDownload(url) {
    try {
      const { isValid, platform } = PlatformDetector.detectPlatform(url);

      if (!isValid) {
        return {
          canDownload: false,
          reason: 'Invalid URL format for platform',
        };
      }

      // Quick metadata check
      const result = await this.extractMetadata(url);
      
      return {
        canDownload: result.success,
        platform,
        reason: result.success ? 'URL is valid and downloadable' : result.error,
      };
    } catch (error) {
      return {
        canDownload: false,
        reason: error.message,
      };
    }
  }

  /**
   * Get file size estimate before download
   * @param {string} url - Media URL
   * @param {string} format - Format ID
   * @returns {Promise<object>} File size info
   */
  static async getFileSizeEstimate(url, format = 'best') {
    try {
      const result = await this.extractMetadata(url);

      if (!result.success) {
        throw new Error(result.error);
      }

      const formats = result.metadata.formats;
      
      if (formats.length === 0) {
        throw new Error('No formats available');
      }

      let estimatedSize = 0;

      if (format === 'best') {
        // Find best format (largest filesize with video codec)
        const videoFormats = formats.filter(f => f.vcodec && f.vcodec !== 'none');
        if (videoFormats.length > 0) {
          estimatedSize = videoFormats[0]?.filesize || 0;
        } else {
          estimatedSize = formats[0]?.filesize || 0;
        }
      } else {
        // Find specific format
        const selectedFormat = formats.find((fmt) => fmt.formatId === format);
        estimatedSize = selectedFormat?.filesize || 0;
      }

      // If filesize is still 0, estimate based on duration and bitrate
      if (estimatedSize === 0 && result.metadata.duration > 0) {
        const avgBitrateMbps = 2.5; // 2.5 Mbps average
        const durationSeconds = result.metadata.duration;
        estimatedSize = (avgBitrateMbps * durationSeconds * 1000000) / 8;
      }

      const estimatedSizeMB = estimatedSize > 0 ? estimatedSize / (1024 * 1024) : 25;

      return {
        success: true,
        estimatedSizeBytes: estimatedSize,
        estimatedSizeMB: estimatedSizeMB.toFixed(2),
        canDownload: estimatedSizeMB <= config.download.maxFileSizeMB,
        maxAllowedMB: config.download.maxFileSizeMB,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = DownloadService;
