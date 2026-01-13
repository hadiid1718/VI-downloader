/**
 * Logger utility
 */

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

class Logger {
  constructor(level = 'info') {
    this.level = LOG_LEVELS[level] || LOG_LEVELS.info;
  }

  log(logLevel, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: logLevel.toUpperCase(),
      message,
      ...meta,
    };

    if (LOG_LEVELS[logLevel] <= this.level) {
      console.log(JSON.stringify(logEntry));
    }
  }

  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }
}

module.exports = Logger;
