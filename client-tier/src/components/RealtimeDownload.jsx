import React, { useState } from 'react';
import StreamDownloadService from '../../services/streamDownloadService';
import './RealtimeDownload.css';

const RealtimeDownload = ({ url, platform }) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // idle, downloading, completed, error
  const [message, setMessage] = useState('');
  const [downloadedFile, setDownloadedFile] = useState(null);
  const [error, setError] = useState(null);
  const [format, setFormat] = useState('best');

  const handleStartDownload = async () => {
    if (!url) {
      setError('Please provide a URL');
      return;
    }

    setStatus('downloading');
    setProgress(0);
    setMessage('Initializing download...');
    setError(null);

    try {
      await StreamDownloadService.streamDownload(
        url,
        format,
        // onProgress callback
        (data) => {
          setProgress(data.progress || 0);
          setMessage(data.message || 'Downloading...');
        },
        // onComplete callback
        (data) => {
          setDownloadedFile(data.file);
          setStatus('completed');
          setProgress(100);
          setMessage('Download completed! Ready to save.');

          // Auto-download file to user's system
          setTimeout(() => {
            handleDownloadFile(data.file);
          }, 500);
        },
        // onError callback
        (errorMsg) => {
          setStatus('error');
          setError(errorMsg);
          setMessage('Download failed');
          setProgress(0);
        }
      );
    } catch (err) {
      setStatus('error');
      setError(err.message);
      setMessage('Download failed');
    }
  };

  const handleDownloadFile = async (filename) => {
    try {
      await StreamDownloadService.downloadFile(filename);
      setMessage('File saved to your system!');
    } catch (err) {
      setError(`Failed to download file: ${err.message}`);
    }
  };

  const handleCancel = () => {
    setStatus('idle');
    setProgress(0);
    setMessage('');
    setDownloadedFile(null);
  };

  const getStatusColor = () => {
    switch (status) {
      case 'downloading':
        return '#ffc107';
      case 'completed':
        return '#28a745';
      case 'error':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'downloading':
        return 'DOWNLOADING';
      case 'completed':
        return 'COMPLETED';
      case 'error':
        return 'ERROR';
      default:
        return 'READY';
    }
  };

  return (
    <div className="realtime-download">
      <div className="download-header">
        <h3>Real-time Download</h3>
        <span className="platform-badge">{platform}</span>
      </div>

      <div className="download-controls">
        <div className="format-selector">
          <label>Format:</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            disabled={status === 'downloading'}
          >
            <option value="best">Best Quality</option>
            <option value="worst">Smallest Size</option>
            <option value="18">360p (MP4)</option>
            <option value="22">720p (MP4)</option>
            <option value="298">1080p (MP4)</option>
          </select>
        </div>

        {status === 'idle' && (
          <button className="btn-download" onClick={handleStartDownload}>
            Start Download
          </button>
        )}

        {status === 'downloading' && (
          <button className="btn-cancel" onClick={handleCancel}>
            Cancel
          </button>
        )}

        {status === 'completed' && (
          <>
            <button
              className="btn-redownload"
              onClick={() => handleDownloadFile(downloadedFile)}
            >
              Download Again
            </button>
            <button className="btn-cancel" onClick={handleCancel}>
              New Download
            </button>
          </>
        )}
      </div>

      <div className="download-status">
        <div className="status-header">
          <span
            className="status-badge"
            style={{ backgroundColor: getStatusColor() }}
          >
            {getStatusText()}
          </span>
          <span className="progress-text">{progress}%</span>
        </div>

        <div className="message">{message}</div>

        <div className="progress-container">
          <div
            className="progress-bar"
            style={{
              width: `${progress}%`,
              backgroundColor: getStatusColor(),
            }}
          />
        </div>

        {status === 'downloading' && (
          <div className="downloading-animation">
            <div className="spinner"></div>
            <span>Processing video...</span>
          </div>
        )}

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        {status === 'completed' && downloadedFile && (
          <div className="success-message">
            <span className="success-icon">✓</span>
            <div>
              <p>File: <strong>{downloadedFile}</strong></p>
              <p>The file should be downloading to your system now.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RealtimeDownload;
