/**
 * Environment Configuration
 * Centralized configuration for the frontend
 */

export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  appName: import.meta.env.VITE_APP_NAME || 'V-Downloader',
  appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};

export default config;
