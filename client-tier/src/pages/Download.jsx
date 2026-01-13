import { useState, useEffect } from 'react'
import { HiExclamationCircle, HiClock } from 'react-icons/hi'
import { MdDownload, MdCheckCircle, MdClose, MdArrowBack } from 'react-icons/md'
import { FaUser, FaCalendarAlt, FaEye, FaHeart } from 'react-icons/fa'
import apiClient from '../services/apiClient'
import '../styles/Download.css'

const Download = ({
  url,
  platform,
  metadata,
  formats,
  onBack,
  getPlatformIcon
}) => {
  // Download state
  const [selectedFormat, setSelectedFormat] = useState(formats[0]?.formatId || 'best')
  const [filename, setFilename] = useState('')
  const [fileSize, setFileSize] = useState(null)
  const [jobId, setJobId] = useState(null)
  const [downloadStatus, setDownloadStatus] = useState(null)
  const [activeDownloads, setActiveDownloads] = useState([])
  const [downloadHistory, setDownloadHistory] = useState([])

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')

  // Generate filename from metadata
  useEffect(() => {
    if (metadata && metadata.title) {
      const sanitized = metadata.title.replace(/[^\w\s-]/g, '').slice(0, 50)
      setFilename(sanitized || 'download')
      console.log('Download component received metadata:', metadata)
    }
  }, [metadata])

  // Utility function to proxy thumbnails through server to avoid CORS issues
  const getThumbnailProxyUrl = (thumbnailUrl) => {
    if (!thumbnailUrl) return null;
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    return `${API_BASE_URL}/api/proxy/thumbnail?url=${encodeURIComponent(thumbnailUrl)}`;
  }

  const handleCheckFileSize = async () => {
    if (!selectedFormat) return

    setLoading(true)
    setError(null)

    try {
      const data = await apiClient.getFileSize(url, selectedFormat)

      if (data.success && data.size !== undefined) {
        setFileSize({
          sizeMB: data.size.toFixed(2),
          canDownload: data.canDownload,
          maxAllowedMB: data.maxAllowedMB || 500,
        })
      } else {
        setError('Could not determine file size')
      }
    } catch (err) {
      setError('Failed to check file size: ' + err.message)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!url.trim() || !selectedFormat) {
      setError('Please select a format')
      return
    }

    if (fileSize && !fileSize.canDownload) {
      setError('File size exceeds maximum allowed size')
      return
    }

    setLoading(true)
    setError(null)
    setSuccessMessage('')

    try {
      // Reset progress
      setDownloadStatus({
        state: 'connecting',
        progress: 0,
        message: 'Connecting to media source...'
      })

      // Use direct streaming download
      const result = await apiClient.directStreamDownload(
        url.trim(),
        selectedFormat,
        (progressData) => {
          console.log('Download progress:', progressData)

          // Update status based on SSE data
          const statusMessage = progressData.message || getStatusMessage(progressData.status)
          const progress = Math.round(progressData.progress || 0)

          setDownloadStatus({
            state: progressData.status,
            progress: progress,
            message: statusMessage,
            downloaded: progressData.downloaded,
            total: progressData.total,
            speed: progressData.speed,
            eta: progressData.eta,
          })

          // Update active downloads
          setActiveDownloads(prev => {
            const existing = prev.find(d => d.filename === filename)
            if (existing) {
              return prev.map(d =>
                d.filename === filename
                  ? { ...d, progress, state: progressData.status }
                  : d
              )
            } else {
              return [...prev, {
                jobId: `stream-${Date.now()}`,
                filename: filename,
                platform,
                progress,
                state: progressData.status
              }]
            }
          })
        }
      )

      if (result.success) {
        // Download file to user's system
        if (result.downloadUrl) {
          await apiClient.downloadFile(result.filename)
        }

        setSuccessMessage(`✓ Download completed! File: ${result.filename}`)

        // Add to history
        setDownloadHistory(prev => [{
          jobId: `${Date.now()}`,
          filename: filename,
          platform,
          completedAt: new Date(),
          status: 'completed',
          fileSize: result.fileSizeMB
        }, ...prev].slice(0, 10))

        // Remove from active
        setActiveDownloads(prev => prev.filter(d => d.filename !== filename))

        // Clear download status after delay
        setTimeout(() => {
          setDownloadStatus(null)
        }, 3000)
      } else {
        setError(result.message || 'Download failed')
      }
    } catch (err) {
      setError('Download failed: ' + err.message)
      console.error('Download error:', err)

      setDownloadStatus({
        state: 'failed',
        progress: 0,
        message: err.message
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusMessage = (state) => {
    const messages = {
      connecting: 'Connecting to media source...',
      downloading: 'Downloading...',
      processing: 'Processing...',
      completed: 'Download completed!',
      error: 'Download failed',
      cancelled: 'Download cancelled'
    }
    return messages[state] || 'Processing...'
  }

  const handleCancelDownload = async () => {
    if (!jobId) return

    try {
      const data = await apiClient.cancelDownload(jobId)

      if (data.success) {
        setError(null)
        setSuccessMessage('Download cancelled')
        setJobId(null)
        setDownloadStatus(null)

        // Remove from active downloads
        setActiveDownloads(prev => prev.filter(d => d.jobId !== jobId))
      } else {
        setError(data.message || 'Failed to cancel download')
      }
    } catch (err) {
      setError('Failed to cancel download: ' + err.message)
      console.error(err)
    }
  }

  const handleRetryDownload = () => {
    setError(null)
    setDownloadStatus(null)
    setJobId(null)
    handleDownload()
  }

  const resetForm = () => {
    setSelectedFormat(formats[0]?.formatId || 'best')
    setError(null)
    setSuccessMessage('')
    setJobId(null)
    setDownloadStatus(null)
    setFileSize(null)
    setFilename('')
  }

  return (
    <div className="download-page">
      {/* Back Button */}
      <div className="download-header">
        <button className="btn btn-back" onClick={onBack}>
          <MdArrowBack /> Back to URL
        </button>
        <h2>Download Media</h2>
      </div>

      {/* Error Messages */}
      {error && (
        <section className="alert-section error-alert">
          <div className="container">
            <div className="alert-content">
              <HiExclamationCircle className="alert-icon" />
              <div className="alert-message">
                <strong>Error!</strong> {error}
              </div>
              <button
                className="alert-close"
                onClick={() => setError(null)}
              >
                <MdClose />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Success Messages */}
      {successMessage && (
        <section className="alert-section success-alert">
          <div className="container">
            <div className="alert-content">
              <MdCheckCircle className="alert-icon" />
              <div className="alert-message">
                <strong>Success!</strong> {successMessage}
              </div>
              <button
                className="alert-close"
                onClick={() => setSuccessMessage('')}
              >
                <MdClose />
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="container download-container">
        {/* Metadata Card */}
        {metadata && (
          <div className="metadata-card large">
            <div className="metadata-header">
              {metadata.thumbnail ? (
                <img 
                  src={getThumbnailProxyUrl(metadata.thumbnail)} 
                  alt={metadata.title} 
                  className="thumbnail"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                  }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <MdDownload style={{ fontSize: '4rem', color: 'white', opacity: 0.5 }} />
                </div>
              )}
              <div className="metadata-badge">
                {getPlatformIcon(platform)}
                <span>{platform}</span>
              </div>
            </div>
            <div className="metadata-content">
              <h3>{metadata.title || 'Untitled'}</h3>
              <div className="metadata-details">
                {metadata.uploader && (
                  <p className="uploader">
                    <span className="label">
                      <FaUser className="uploader-icon" />
                      Creator
                    </span>
                    <span className="value">{metadata.uploader}</span>
                  </p>
                )}
                {metadata.duration && (
                  <p className="duration">
                    <span className="label">
                      <HiClock className="duration-icon" />
                      Duration
                    </span>
                    <span className="value">
                      {Math.floor(metadata.duration / 60)}:{(metadata.duration % 60).toString().padStart(2, '0')}
                    </span>
                  </p>
                )}
                {metadata.views && (
                  <p className="views">
                    <span className="label">
                      <FaEye className="views-icon" />
                      Views
                    </span>
                    <span className="value">{metadata.views.toLocaleString()}</span>
                  </p>
                )}
                {metadata.likes && (
                  <p className="likes">
                    <span className="label">
                      <FaHeart className="views-icon" />
                      Likes
                    </span>
                    <span className="value">{metadata.likes.toLocaleString()}</span>
                  </p>
                )}
                {metadata.uploadDate && (
                  <p className="date">
                    <span className="label">
                      <FaCalendarAlt className="date-icon" />
                      Uploaded
                    </span>
                    <span className="value">
                      {new Date(metadata.uploadDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="download-content">
          {/* Formats Section */}
          {formats.length > 0 && !downloadStatus && (
            <div className="formats-section">
              <h4>Select Format & Quality</h4>
              <div className="formats-grid">
                {formats.map((format, index) => (
                  <div
                    key={index}
                    className={`format-card ${selectedFormat === format.formatId ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedFormat(format.formatId)
                      setFileSize(null)
                    }}
                  >
                    <div className="format-info">
                      <strong>{format.extension?.toUpperCase() || 'MP4'}</strong>
                      {format.resolution && <span className="resolution">{format.resolution}</span>}
                      {format.fps && <span className="fps">{format.fps}fps</span>}
                      {format.filesize && (
                        <span className="size">{(format.filesize / 1024 / 1024).toFixed(2)} MB</span>
                      )}
                    </div>
                    {selectedFormat === format.formatId && (
                      <MdCheckCircle className="check-icon" />
                    )}
                  </div>
                ))}
              </div>

              {fileSize && (
                <div className={`file-size-info ${fileSize.canDownload ? 'success' : 'warning'}`}>
                  <p>
                    <strong>Estimated Size:</strong> {fileSize.sizeMB} MB
                  </p>
                  {!fileSize.canDownload && (
                    <p className="warning-text">
                      <HiExclamationCircle /> File exceeds maximum allowed size ({fileSize.maxAllowedMB} MB)
                    </p>
                  )}
                </div>
              )}

              {/* Filename Input */}
              <div className="filename-section">
                <label htmlFor="download-filename">Download Filename</label>
                <div className="filename-input-group">
                  <input
                    id="download-filename"
                    type="text"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    placeholder="Enter filename (without extension)"
                    className="filename-input"
                  />
                  <span className="filename-extension">
                    {formats.find(f => f.formatId === selectedFormat)?.extension || '.mp4'}
                  </span>
                </div>
                <p className="filename-hint">Filename will be sanitized and extension added automatically</p>
              </div>

              {/* Action Buttons */}
              <div className="download-actions">
                <button
                  className="btn btn-primary btn-large"
                  onClick={handleDownload}
                  disabled={loading || !selectedFormat || (fileSize && !fileSize.canDownload)}
                  title={fileSize && !fileSize.canDownload ? 'File size exceeds limit' : ''}
                >
                  <MdDownload className="btn-icon" />
                  {loading ? 'Starting...' : 'Start Download'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleCheckFileSize}
                  disabled={loading || !selectedFormat}
                >
                  Check Size First
                </button>
              </div>
            </div>
          )}

          {/* Download Status Section */}
          {downloadStatus && (
            <div className="download-status-section">
              <h4>Download Status</h4>
              <div className="status-card">
                <div className="status-header">
                  <div className="status-info">
                    <span className={`status-badge ${downloadStatus.state}`}>
                      {downloadStatus.state.toUpperCase()}
                    </span>
                    <span className="job-id">ID: {jobId?.slice(0, 12)}...</span>
                  </div>
                  <span className="status-message">{downloadStatus.message}</span>
                </div>

                {/* Progress Bar */}
                {(downloadStatus.state === 'active' || downloadStatus.state === 'queued' || downloadStatus.progress > 0) && (
                  <div className="progress-container">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(downloadStatus.progress || 0, 100)}%`,
                          transition: 'width 0.3s ease'
                        }}
                      ></div>
                    </div>
                    <div className="progress-text">
                      <span className="progress-percentage">{Math.round(downloadStatus.progress || 0)}%</span>
                      {downloadStatus.state === 'active' && (
                        <span className="progress-eta">Downloading...</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Attempts Info */}
                {downloadStatus.attempts !== undefined && (
                  <div className="attempts-info">
                    Attempt {downloadStatus.attempts} of {downloadStatus.maxAttempts || 3}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="status-actions">
                  {downloadStatus.state === 'active' && (
                    <button
                      className="btn btn-danger"
                      onClick={handleCancelDownload}
                      disabled={loading}
                    >
                      Cancel Download
                    </button>
                  )}
                  {downloadStatus.state === 'completed' && (
                    <div className="success-container">
                      <MdCheckCircle className="success-icon" />
                      <p className="success-text">Download completed successfully!</p>
                      <button
                        className="btn btn-secondary"
                        onClick={resetForm}
                      >
                        Download Another Format
                      </button>
                    </div>
                  )}
                  {downloadStatus.state === 'failed' && (
                    <div className="error-container">
                      <HiExclamationCircle className="error-icon" />
                      <p className="error-text">{downloadStatus.message || 'Download failed'}</p>
                      <div className="error-actions">
                        <button
                          className="btn btn-warning"
                          onClick={handleRetryDownload}
                          disabled={loading}
                        >
                          Retry Download
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={resetForm}
                        >
                          Select Different Format
                        </button>
                      </div>
                    </div>
                  )}
                  {downloadStatus.state === 'cancelled' && (
                    <button
                      className="btn btn-secondary"
                      onClick={resetForm}
                    >
                      Start New Download
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Active Downloads List */}
          {activeDownloads.length > 0 && (
            <div className="active-downloads-section">
              <h4>Active Downloads ({activeDownloads.length})</h4>
              <div className="downloads-list">
                {activeDownloads.map((download) => (
                  <div key={download.jobId} className="download-item">
                    <div className="download-item-header">
                      <span className="download-filename">{download.filename}</span>
                      <span className={`download-state ${download.state}`}>{download.state}</span>
                    </div>
                    <div className="download-item-progress">
                      <div className="progress-bar small">
                        <div
                          className="progress-fill"
                          style={{ width: `${download.progress}%` }}
                        ></div>
                      </div>
                      <span className="progress-text">{download.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Download History */}
          {downloadHistory.length > 0 && (
            <div className="download-history-section">
              <h4>Download History (Last 10)</h4>
              <div className="history-list">
                {downloadHistory.map((item) => (
                  <div key={item.jobId} className={`history-item ${item.status}`}>
                    <div className="history-item-icon">
                      {item.status === 'completed' ? (
                        <MdCheckCircle />
                      ) : (
                        <HiExclamationCircle />
                      )}
                    </div>
                    <div className="history-item-content">
                      <span className="history-filename">{item.filename}</span>
                      <span className="history-platform">{item.platform}</span>
                    </div>
                    <span className={`history-status ${item.status}`}>
                      {item.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Download
