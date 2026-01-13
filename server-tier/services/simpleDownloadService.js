const axios = require('axios');
const config = require('../config/config');
const PlatformDetector = require('./platformDetector');
const { buildYtDlpCommand } = require('./platformHeaders');
const InstagramHandler = require('./instagramHandler');

/**
 * Utility function to estimate filesize based on resolution and duration
 * Uses rough bitrate estimation: 
 * - 360p: ~800 kbps, 480p: ~1.5 Mbps, 720p: ~2.5 Mbps, 1080p+: ~4-6 Mbps
 */
function estimateFilesize(height, width, duration, format = 'mp4') {
  if (!height || !width || !duration) return 0;
  
  // Estimate bitrate based on resolution (in kbps)
  let bitrate = 800; // base bitrate for 360p
  
  if (height >= 2160) bitrate = 6000;      // 4K
  else if (height >= 1440) bitrate = 5000; // 1440p
  else if (height >= 1080) bitrate = 4000; // 1080p
  else if (height >= 720) bitrate = 2500;  // 720p
  else if (height >= 480) bitrate = 1500;  // 480p
  else bitrate = 800;                       // 360p or lower
  
  // Calculate filesize in MB: (duration * bitrate) / 8000
  const fileSizeMB = (duration * bitrate) / 8000;
  return parseFloat(fileSizeMB.toFixed(2));
}

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
        
        // Extract thumbnail safely - try multiple sources
        let thumbnail = null;
        if (metadata.thumbnail) {
          thumbnail = metadata.thumbnail;
        } else if (metadata.thumbnails && Array.isArray(metadata.thumbnails) && metadata.thumbnails.length > 0) {
          // Get the highest quality thumbnail (usually the last one)
          thumbnail = metadata.thumbnails[metadata.thumbnails.length - 1].url || metadata.thumbnails[0].url;
        }

        // Build formats array with proper filesize calculation
        let formats = [];
        if (metadata.formats && metadata.formats.length > 0) {
          formats = metadata.formats
            .filter(fmt => fmt && (fmt.ext || fmt.format_id))
            .map((fmt) => {
              // Get resolution info
              const height = fmt.height || parseInt(fmt.format?.split('x')[1]) || 0;
              const width = fmt.width || parseInt(fmt.format?.split('x')[0]) || 0;
              
              // Calculate or get filesize
              let filesize = fmt.filesize || fmt.size || 0;
              if (!filesize || filesize === 0) {
                // Estimate filesize if not provided
                filesize = estimateFilesize(height, width, metadata.duration || 0);
              } else {
                // Convert bytes to MB
                filesize = parseFloat((filesize / (1024 * 1024)).toFixed(2));
              }
              
              return {
                formatId: fmt.format_id || fmt.ext || 'unknown',
                extension: fmt.ext || 'mp4',
                resolution: height ? `${height}p` : (fmt.format || 'unknown'),
                filesize: filesize,
                fps: fmt.fps || fmt.frame_rate || 30, // Default to 30fps if not specified
                height: height,
                width: width,
              };
            })
            .sort((a, b) => b.height - a.height); // Sort by resolution (highest first)
        }

        return {
          success: true,
          metadata: {
            title: metadata.title || metadata.alt_title || 'Unknown',
            duration: metadata.duration || 0,
            uploader: metadata.uploader || metadata.creator || 'Unknown',
            uploadDate: metadata.upload_date || metadata.release_date || null,
            views: metadata.view_count || null,
            likes: metadata.like_count || null,
            description: metadata.description || null,
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

      // Extract thumbnail safely - try multiple sources
      let thumbnail = null;
      if (metadata.thumbnail) {
        thumbnail = metadata.thumbnail;
      } else if (metadata.thumbnails && Array.isArray(metadata.thumbnails) && metadata.thumbnails.length > 0) {
        // Get the highest quality thumbnail (usually the last one)
        thumbnail = metadata.thumbnails[metadata.thumbnails.length - 1].url || metadata.thumbnails[0].url;
      }

      // Build formats array with proper filesize calculation
      let formats = [];
      if (metadata.formats && metadata.formats.length > 0) {
        formats = metadata.formats
          .filter(fmt => fmt && (fmt.ext || fmt.format_id))
          .map((fmt) => {
            // Get resolution info
            const height = fmt.height || parseInt(fmt.format?.split('x')[1]) || 0;
            const width = fmt.width || parseInt(fmt.format?.split('x')[0]) || 0;
            
            // Calculate or get filesize
            let filesize = fmt.filesize || fmt.size || 0;
            if (!filesize || filesize === 0) {
              // Estimate filesize if not provided
              filesize = estimateFilesize(height, width, metadata.duration || 0);
            } else {
              // Convert bytes to MB
              filesize = parseFloat((filesize / (1024 * 1024)).toFixed(2));
            }
            
            return {
              formatId: fmt.format_id || fmt.ext || 'unknown',
              extension: fmt.ext || 'mp4',
              resolution: height ? `${height}p` : (fmt.format || 'unknown'),
              filesize: filesize,
              fps: fmt.fps || fmt.frame_rate || 30, // Default to 30fps if not specified
              height: height,
              width: width,
            };
          })
          .sort((a, b) => b.height - a.height); // Sort by resolution (highest first)
      }

      return {
        success: true,
        metadata: {
          title: metadata.title || metadata.alt_title || 'Unknown',
          duration: metadata.duration || 0,
          uploader: metadata.uploader || metadata.creator || 'Unknown',
          uploadDate: metadata.upload_date || metadata.release_date || null,
          views: metadata.view_count || null,
          likes: metadata.like_count || null,
          description: metadata.description || null,
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
