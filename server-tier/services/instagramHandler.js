/**
 * Instagram-specific download handler
 * Handles Instagram's aggressive anti-bot protections
 */

const { execSync, exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class InstagramHandler {
  /**
   * Common reasons Instagram blocks yt-dlp:
   * 1. No proper user agent headers
   * 2. No proper referer header
   * 3. Rate limiting / IP bans
   * 4. Missing cookies or authentication
   * 5. Connection timeouts
   */

  /**
   * Check if Instagram URL is accessible
   * @param {string} url - Instagram URL
   * @returns {Promise<boolean>} True if accessible
   */
  static async isInstagramAccessible(url) {
    try {
      const axios = require('axios');
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.instagram.com/',
        },
        timeout: 10000,
      });

      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Try to extract Instagram metadata with different strategies
   * @param {string} url - Instagram URL
   * @returns {Promise<object>} Metadata or error
   */
  static async extractMetadataWithStrategies(url) {
    const strategies = [
      // Strategy 1: Default yt-dlp with extended timeout
      async () => {
        const command = `yt-dlp --dump-json --no-warnings --socket-timeout 45 --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" --no-check-certificate "${url}"`;
        const stdout = execSync(command, { 
          timeout: 90000,
          encoding: 'utf8',
          maxBuffer: 20 * 1024 * 1024,
        });
        return JSON.parse(stdout);
      },

      // Strategy 2: yt-dlp with fragment retries
      async () => {
        const command = `yt-dlp --dump-json --no-warnings --socket-timeout 45 --fragment-retries 10 --skip-unavailable-fragments --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" --no-check-certificate "${url}"`;
        const stdout = execSync(command, { 
          timeout: 90000,
          encoding: 'utf8',
          maxBuffer: 20 * 1024 * 1024,
        });
        return JSON.parse(stdout);
      },

      // Strategy 3: yt-dlp with retries
      async () => {
        const command = `yt-dlp --dump-json --no-warnings --socket-timeout 45 --retries 5 --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" --no-check-certificate "${url}"`;
        const stdout = execSync(command, { 
          timeout: 90000,
          encoding: 'utf8',
          maxBuffer: 20 * 1024 * 1024,
        });
        return JSON.parse(stdout);
      },
    ];

    let lastError;

    for (let i = 0; i < strategies.length; i++) {
      try {
        console.log(`Instagram extraction strategy ${i + 1}/3...`);
        const metadata = await strategies[i]();
        return {
          success: true,
          metadata,
          strategy: i + 1,
        };
      } catch (error) {
        lastError = error;
        console.warn(`Strategy ${i + 1} failed: ${error.message}`);
        
        // Wait before trying next strategy
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
      }
    }

    return {
      success: false,
      error: lastError,
      message: 'All Instagram extraction strategies failed. Instagram may have rate-limited your IP or requires authentication.',
    };
  }

  /**
   * Get Instagram metadata with fallback strategies
   * @param {string} url - Instagram URL
   * @returns {Promise<object>} Metadata result
   */
  static async getMetadata(url) {
    // Check if Instagram is accessible first
    const isAccessible = await this.isInstagramAccessible(url);
    
    if (!isAccessible) {
      return {
        success: false,
        error: 'Instagram is not accessible from your current location/IP. You may be rate-limited or blocked.',
      };
    }

    // Try extraction with strategies
    return await this.extractMetadataWithStrategies(url);
  }
}

module.exports = InstagramHandler;
