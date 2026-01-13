/**
 * Platform-specific headers and configurations for yt-dlp
 */

// Standard browser user agent
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Get platform-specific yt-dlp options
 * @param {string} platform - Platform name
 * @returns {object} Platform-specific options
 */
function getPlatformOptions(platform) {
  const baseOptions = {
    userAgent: BROWSER_UA,
    noCheckCertificate: true,
    socketTimeout: 30,
  };

  switch (platform.toLowerCase()) {
    case 'instagram':
      return {
        ...baseOptions,
        socketTimeout: 45, // Instagram may be slower
        retries: 5, // More retries for Instagram
        fragmentRetries: 10,
        skipUnavailableFragments: true,
        // Instagram-specific options to bypass restrictions
        headers: {
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.instagram.com/',
          'User-Agent': BROWSER_UA,
        },
      };

    case 'tiktok':
      return {
        ...baseOptions,
        socketTimeout: 40,
        retries: 5,
        fragmentRetries: 10,
      };

    case 'youtube':
      return {
        ...baseOptions,
        socketTimeout: 30,
        retries: 3,
      };

    case 'twitter':
    case 'x':
      return {
        ...baseOptions,
        socketTimeout: 35,
        retries: 4,
      };

    case 'facebook':
      return {
        ...baseOptions,
        socketTimeout: 35,
        retries: 4,
      };

    default:
      return {
        ...baseOptions,
        retries: 3,
      };
  }
}

/**
 * Build yt-dlp command with platform-specific options
 * @param {string} url - Media URL
 * @param {string} platform - Platform name
 * @param {boolean} jsonOutput - Whether to output JSON
 * @returns {string} yt-dlp command
 */
function buildYtDlpCommand(url, platform, jsonOutput = false) {
  const options = getPlatformOptions(platform);
  let command = 'yt-dlp';

  if (jsonOutput) {
    command += ' --dump-json';
  }

  command += ` --no-warnings`;
  command += ` --socket-timeout ${options.socketTimeout}`;
  command += ` --user-agent "${options.userAgent}"`;
  command += ` --no-check-certificate`;

  // Add retries for flaky platforms
  if (options.retries > 1) {
    command += ` --retries ${options.retries}`;
  }

  if (options.fragmentRetries && options.fragmentRetries > 1) {
    command += ` --fragment-retries ${options.fragmentRetries}`;
  }

  if (options.skipUnavailableFragments) {
    command += ` --skip-unavailable-fragments`;
  }

  command += ` "${url}"`;

  return command;
}

/**
 * Build yt-dlp download command with platform-specific options
 * @param {string} url - Media URL
 * @param {string} platform - Platform name
 * @param {string} format - Format ID
 * @param {string} outputTemplate - Output file template
 * @returns {string} yt-dlp command
 */
function buildDownloadCommand(url, platform, format = 'best', outputTemplate) {
  const options = getPlatformOptions(platform);
  let command = 'yt-dlp';

  command += ` -f "${format}"`;
  command += ` --no-warnings`;
  command += ` --socket-timeout ${options.socketTimeout}`;
  command += ` --user-agent "${options.userAgent}"`;
  command += ` --no-check-certificate`;

  // Add retries for flaky platforms
  if (options.retries > 1) {
    command += ` --retries ${options.retries}`;
  }

  if (options.fragmentRetries && options.fragmentRetries > 1) {
    command += ` --fragment-retries ${options.fragmentRetries}`;
  }

  if (options.skipUnavailableFragments) {
    command += ` --skip-unavailable-fragments`;
  }

  command += ` -o "${outputTemplate}"`;
  command += ` "${url}"`;

  return command;
}

module.exports = {
  BROWSER_UA,
  getPlatformOptions,
  buildYtDlpCommand,
  buildDownloadCommand,
};
