const axios = require('axios');
const config = require('../config/config');
const PlatformDetector = require('./platformDetector');
const { buildYtDlpCommand } = require('./platformHeaders');
const InstagramHandler = require('./instagramHandler');

/**
 * Simple HTTP-based download service (no queue required)
 * Useful for testing and when Redis is not available
 */
class SimpleDownloadService {
  /**
   * Extract media metadata using yt-dlp
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
            }))
            .sort((a, b) => b.filesize - a.filesize);
        }

        return {
          success: true,
          metadata: {
            title: metadata.title || 'Unknown',
            duration: metadata.duration || 0,
            uploader: metadata.uploader || 'Unknown',
            uploadDate: metadata.upload_date || null,
            thumbnail: thumbnail,
            formats,
            platform,
          },
        };
      }
      
      // Build yt-dlp command for metadata extraction with platform-specific options
      const { execSync } = require('child_process');
      const command = buildYtDlpCommand(url, platform, true);

      let stdout;
      try {
        stdout = execSync(command, {
          timeout: 60000,
          encoding: 'utf8',
          maxBuffer: 20 * 1024 * 1024,
        });
      } catch (error) {
        throw new Error(`Failed to extract metadata: ${error.message}`);
      }

      if (!stdout) {
        throw new Error('No metadata returned from yt-dlp');
      }

      const metadata = JSON.parse(stdout);

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
          }))
          .sort((a, b) => b.filesize - a.filesize);
      }

      return {
        success: true,
        metadata: {
          title: metadata.title || 'Unknown',
          duration: metadata.duration || 0,
          uploader: metadata.uploader || 'Unknown',
          uploadDate: metadata.upload_date || null,
          thumbnail: thumbnail,
          formats,
          platform,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get available formats for media
   * @param {string} url - Media URL
   * @returns {Promise<object>} Available formats
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
      let estimatedSize = 0;

      if (format === 'best') {
        // Find best format
        estimatedSize =
          formats[0]?.filesize ||
          formats.reduce((max, fmt) => (fmt.filesize > max ? fmt.filesize : max), 0);
      } else {
        // Find specific format
        const selectedFormat = formats.find((fmt) => fmt.formatId === format);
        estimatedSize = selectedFormat?.filesize || 0;
      }

      const estimatedSizeMB = estimatedSize / (1024 * 1024);

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

  /**
   * Validate if URL can be downloaded
   * @param {string} url - Media URL
   * @returns {Promise<object>} Can download or not
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
}

module.exports = SimpleDownloadService;
