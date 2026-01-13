/**
 * API Client Service
 * Centralized API communication layer for the frontend
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

class APIClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Generic fetch wrapper with error handling
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const finalOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, finalOptions);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error: ${endpoint}`, error);
      throw error;
    }
  }

  /**
   * Detect platform from URL
   */
  async detectPlatform(url) {
    return this.request('/api/detect', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  /**
   * Get media metadata
   */
  async getMetadata(url) {
    return this.request('/api/metadata', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  /**
   * Get available formats
   */
  async getFormats(url) {
    return this.request('/api/formats', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  /**
   * Check if URL can be downloaded
   */
  async checkDownloadability(url) {
    return this.request('/api/check', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  /**
   * Get file size estimate
   */
  async getFileSize(url, formatId = 'best') {
    return this.request('/api/filesize', {
      method: 'POST',
      body: JSON.stringify({ url, formatId }),
    });
  }

  /**
   * Start download (queue it)
   */
  async startDownload(url, formatId = 'best', filename = null) {
    return this.request('/api/download', {
      method: 'POST',
      body: JSON.stringify({ url, formatId, filename }),
    });
  }

  /**
   * Get download job status
   */
  async getDownloadStatus(jobId) {
    return this.request(`/api/download/status/${jobId}`, {
      method: 'GET',
    });
  }

  /**
   * Cancel download job
   */
  async cancelDownload(jobId) {
    return this.request(`/api/download/cancel/${jobId}`, {
      method: 'POST',
    });
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    return this.request('/api/queue/stats', {
      method: 'GET',
    });
  }

  /**
   * Get active downloads
   */
  async getActiveDownloads() {
    return this.request('/api/downloads/active', {
      method: 'GET',
    });
  }

  /**
   * Server health check
   */
  async healthCheck() {
    return this.request('/health', {
      method: 'GET',
    });
  }
}

// Create a singleton instance
export default new APIClient();
