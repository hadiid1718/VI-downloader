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
   * Start direct streaming download (downloads to user's system)
   * Uses Server-Sent Events (SSE) for real-time progress
   */
  async directStreamDownload(url, formatId = 'best', onProgress = null) {
    const self = this;
    return new Promise((resolve, reject) => {
      (async () => {
        try {
          const response = await fetch(`${self.baseURL}/api/stream/download`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url, format: formatId }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `HTTP ${response.status}`);
          }

          // Read response as stream
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let downloadUrl = null;
          let filename = null;

          while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Parse Server-Sent Events (SSE) format
            const lines = buffer.split('\n');
            buffer = lines[lines.length - 1]; // Keep incomplete line

            for (let i = 0; i < lines.length - 1; i++) {
              const line = lines[i];
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));

                  // Call progress callback
                  if (onProgress) {
                    onProgress(data);
                  }

                  // Capture download info
                  if (data.downloadUrl) {
                    downloadUrl = data.downloadUrl;
                    filename = data.file;
                  }

                  // Handle completion
                  if (data.status === 'completed') {
                    resolve({
                      success: true,
                      status: 'completed',
                      downloadUrl,
                      filename,
                      fileSizeMB: data.fileSizeMB,
                    });
                    return;
                  }

                  // Handle error
                  if (data.status === 'error') {
                    reject(new Error(data.message || 'Download failed'));
                    return;
                  }
                } catch (e) {
                  console.error('Failed to parse SSE data:', line, e);
                }
              }
            }
          }

          reject(new Error('Download stream ended without completion'));
        } catch (error) {
          console.error('Stream download error:', error);
          reject(error);
        }
      })();
    });
  }

  /**
   * Download file from server to user's system
   */
  async downloadFile(filename) {
    try {
      const response = await fetch(`${this.baseURL}/api/download/file/${encodeURIComponent(filename)}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Get the blob
      const blob = await response.blob();

      // Create a temporary download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error('File download error:', error);
      throw error;
    }
  }

  /**
   * Start queued download (legacy, saves on server)
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
    return this.request(`/api/download/${jobId}`, {
      method: 'DELETE',
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
