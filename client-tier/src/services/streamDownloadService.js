/**
 * Real-time download service for handling streaming downloads
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class StreamDownloadService {
  /**
   * Start real-time download with progress tracking
   * @param {string} url - Media URL to download
   * @param {string} format - Video format
   * @param {function} onProgress - Progress callback
   * @param {function} onComplete - Completion callback
   * @param {function} onError - Error callback
   * @returns {Promise<object>} Download result
   */
  static async streamDownload(url, format = 'best', onProgress, onComplete, onError) {
    try {
      const response = await fetch(`${API_BASE_URL}/stream/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, format }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      // Parse Server-Sent Events
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.status === 'error') {
                if (onError) onError(data.error);
              } else if (data.status === 'completed') {
                if (onComplete) onComplete(data);
              } else {
                if (onProgress) onProgress(data);
              }
            } catch (e) {
              console.error('Failed to parse SSE message:', e);
            }
          }
        }
      }
    } catch (error) {
      if (onError) onError(error.message);
      throw error;
    }
  }

  /**
   * Download file directly to user's system
   * @param {string} filename - File to download
   */
  static async downloadFile(filename) {
    try {
      const response = await fetch(`${API_BASE_URL}/download/file/${encodeURIComponent(filename)}`);

      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
      }

      // Get filename from headers or use provided one
      const contentDisposition = response.headers.get('content-disposition');
      let downloadFilename = filename;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) downloadFilename = match[1];
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadFilename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return { success: true, filename: downloadFilename };
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  }

  /**
   * Get list of available downloads
   * @returns {Promise<array>} List of files
   */
  static async listDownloads() {
    try {
      const response = await fetch(`${API_BASE_URL}/downloads/list`);

      if (!response.ok) {
        throw new Error('Failed to fetch downloads list');
      }

      const data = await response.json();
      return data.files || [];
    } catch (error) {
      console.error('Failed to list downloads:', error);
      throw error;
    }
  }

  /**
   * Delete a downloaded file
   * @param {string} filename - File to delete
   */
  static async deleteDownload(filename) {
    try {
      const response = await fetch(`${API_BASE_URL}/downloads/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete file');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Delete failed:', error);
      throw error;
    }
  }

  /**
   * Cleanup old files
   * @param {number} hoursOld - Delete files older than this many hours
   */
  static async cleanupFiles(hoursOld = 24) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/downloads/cleanup?hoursOld=${hoursOld}`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        throw new Error('Cleanup failed');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Cleanup failed:', error);
      throw error;
    }
  }
}

export default StreamDownloadService;
