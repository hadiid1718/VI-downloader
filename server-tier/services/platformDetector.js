const axios = require('axios');
const config = require('../config/config');

class PlatformDetector {
  /**
   * Detect platform from URL
   * @param {string} url - Media URL
   * @returns {object} Platform info {platform, isValid, mediaType}
   */
  static detectPlatform(url) {
    if (!url || typeof url !== 'string') {
      return { platform: null, isValid: false, error: 'Invalid URL' };
    }

    const urlLower = url.toLowerCase().trim();

    // Instagram
    if (
      urlLower.includes('instagram.com') ||
      urlLower.includes('instagr.am')
    ) {
      return {
        platform: 'instagram',
        isValid: this.validateInstagramUrl(url),
        mediaType: this.detectInstagramMediaType(url),
      };
    }

    // TikTok
    if (
      urlLower.includes('tiktok.com') ||
      urlLower.includes('vm.tiktok.com') ||
      urlLower.includes('vt.tiktok.com')
    ) {
      return {
        platform: 'tiktok',
        isValid: this.validateTikTokUrl(url),
        mediaType: 'video',
      };
    }

    // Twitter/X
    if (
      urlLower.includes('twitter.com') ||
      urlLower.includes('x.com')
    ) {
      return {
        platform: 'twitter',
        isValid: this.validateTwitterUrl(url),
        mediaType: this.detectTwitterMediaType(url),
      };
    }

    // Facebook
    if (urlLower.includes('facebook.com')) {
      return {
        platform: 'facebook',
        isValid: this.validateFacebookUrl(url),
        mediaType: this.detectFacebookMediaType(url),
      };
    }

    // Pinterest
    if (
      urlLower.includes('pinterest.com') ||
      urlLower.includes('pin.it')
    ) {
      return {
        platform: 'pinterest',
        isValid: this.validatePinterestUrl(url),
        mediaType: 'image',
      };
    }

    return { platform: null, isValid: false, error: 'Unsupported platform' };
  }

  static validateInstagramUrl(url) {
    // Accept any Instagram URL - validation happens during download
    return /instagram\.com|instagr\.am/i.test(url);
  }

  static detectInstagramMediaType(url) {
    if (/\/reel\//i.test(url) || /\/p\//i.test(url)) {
      return 'mixed'; // Can be video or image
    }
    if (/\/tv\//i.test(url)) {
      return 'video';
    }
    return 'mixed';
  }

  static validateTikTokUrl(url) {
    const regex = /tiktok\.com\/@|vm\.tiktok\.com|vt\.tiktok\.com/i;
    return regex.test(url);
  }

  static validateTwitterUrl(url) {
    // Accept any Twitter/X URL - validation happens during download
    return /(twitter|x)\.com/i.test(url);
  }

  static detectTwitterMediaType(url) {
    // Default to mixed as tweets can have multiple media types
    return 'mixed';
  }

  static validateFacebookUrl(url) {
    // Accept any Facebook URL - validation happens during download
    return /facebook\.com/i.test(url);
  }

  static detectFacebookMediaType(url) {
    if (/watch|video/i.test(url)) {
      return 'video';
    }
    if (/photo/i.test(url)) {
      return 'image';
    }
    return 'mixed';
  }

  static validatePinterestUrl(url) {
    const regex = /pinterest\.com|pin\.it/i;
    return regex.test(url);
  }

  /**
   * Get timeout for platform
   */
  static getPlatformTimeout(platform) {
    const timeouts = {
      instagram: config.platformTimeouts.instagram,
      tiktok: config.platformTimeouts.tiktok,
      twitter: config.platformTimeouts.twitter,
      facebook: config.platformTimeouts.facebook,
      pinterest: config.platformTimeouts.pinterest,
    };
    return timeouts[platform] || 30000;
  }
}

module.exports = PlatformDetector;
