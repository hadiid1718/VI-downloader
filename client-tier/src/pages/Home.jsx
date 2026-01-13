import { useState, useEffect, useRef } from 'react'
import { HiExclamationCircle, HiClock } from 'react-icons/hi'
import { MdDownload, MdCheckCircle, MdClose } from 'react-icons/md'
import { FaInstagram, FaTiktok, FaTwitter, FaFacebook, FaPinterest } from 'react-icons/fa'
import Hero from '../components/Hero'
import apiClient from '../services/apiClient'
import '../styles/Home.css'

const Home = () => {
  // URL and Platform Detection
  const [url, setUrl] = useState('')
  const [platform, setPlatform] = useState(null)
  const [metadata, setMetadata] = useState(null)
  const [formats, setFormats] = useState([])
  const [selectedFormat, setSelectedFormat] = useState('best')
  
  // Download Management
  const [filename, setFilename] = useState('')
  const [fileSize, setFileSize] = useState(null)
  const [jobId, setJobId] = useState(null)
  const [downloadStatus, setDownloadStatus] = useState(null)
  const [activeDownloads, setActiveDownloads] = useState([])
  const [downloadHistory, setDownloadHistory] = useState([])
  
  // UI State
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  
  // Polling Reference
  const statusIntervalRef = useRef(null)

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current)
      }
    }
  }, [])

  // Generate filename from metadata
  useEffect(() => {
    if (metadata && metadata.title) {
      const sanitized = metadata.title.replace(/[^\w\s-]/g, '').slice(0, 50)
      setFilename(sanitized || 'download')
    }
  }, [metadata])

  const handleDetectPlatform = async () => {
    if (!url.trim()) {
      setError('Please enter a URL')
      return
    }

    setLoading(true)
    setError(null)
    setPlatform(null)
    setMetadata(null)
    setFormats([])

    try {
      const response = await apiClient.detectPlatform(url.trim())

      if (response.success) {
        setPlatform(response.platform)
        await fetchMetadata()
        await fetchFormats()
      } else {
        setError(response.message || 'Failed to detect platform')
      }
    } catch (err) {
      setError('Failed to connect to server. Please check if backend is running.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMetadata = async () => {
    try {
      const data = await apiClient.getMetadata(url.trim())

      if (data.success && data.metadata) {
        setMetadata(data.metadata)
      }
    } catch (err) {
      console.error('Failed to fetch metadata:', err)
    }
  }

  const fetchFormats = async () => {
    try {
      const data = await apiClient.getFormats(url.trim())

      if (data.success && data.formats) {
        setFormats(data.formats)
        if (data.formats.length > 0) {
          setSelectedFormat(data.formats[0].formatId || 'best')
        }
      }
    } catch (err) {
      console.error('Failed to fetch formats:', err)
    }
  }

  const handleCheckFileSize = async () => {
    if (!url.trim() || !selectedFormat) return

    setLoading(true)
    setError(null)

    try {
      const data = await apiClient.getFileSize(url.trim(), selectedFormat)

      if (data.success) {
        const sizeMB = (data.estimatedSizeBytes / 1024 / 1024).toFixed(2)
        setFileSize({
          sizeMB,
          sizeBytes: data.estimatedSizeBytes,
          canDownload: data.canDownload,
          maxAllowedMB: data.maxAllowedMB,
        })
        
        if (!data.canDownload) {
          setError(`File size exceeds maximum allowed (${data.maxAllowedMB} MB)`)
        }
      } else {
        setError(data.message || 'Failed to check file size')
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
    setShowDownloadModal(false)

    try {
      const downloadData = {
        url: url.trim(),
        formatId: selectedFormat,
        filename: filename || 'download',
        priority: 'normal',
      }

      const response = await apiClient.startDownload(
        downloadData.url,
        downloadData.formatId,
        downloadData.filename
      )

      if (response.success && response.jobId) {
        const newJobId = response.jobId
        setJobId(newJobId)
        
        // Add to active downloads
        setActiveDownloads(prev => [...prev, {
          jobId: newJobId,
          filename: downloadData.filename,
          platform,
          progress: 0,
          state: 'queued'
        }])

        setDownloadStatus({
          state: 'queued',
          progress: 0,
          message: 'Download queued...'
        })

        // Start polling for status
        pollDownloadStatus(newJobId)
        
        setSuccessMessage(`Download started! Job ID: ${newJobId}`)
      } else {
        setError(response.message || 'Failed to start download')
      }
    } catch (err) {
      setError('Failed to start download: ' + err.message)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const pollDownloadStatus = (id) => {
    // Clear existing interval
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current)
    }

    let consecutiveErrors = 0
    const maxErrors = 5

    statusIntervalRef.current = setInterval(async () => {
      try {
        const data = await apiClient.getDownloadStatus(id)

        if (data.success && data.job) {
          const jobData = data.job
          
          setDownloadStatus({
            state: jobData.state,
            progress: jobData.progress || 0,
            message: jobData.message || getStatusMessage(jobData.state),
            attempts: jobData.attemptedCount,
            maxAttempts: jobData.maxAttempts
          })

          // Update active downloads list
          setActiveDownloads(prev => prev.map(d => 
            d.jobId === id 
              ? { ...d, progress: jobData.progress || 0, state: jobData.state }
              : d
          ))

          // Handle completion
          if (jobData.state === 'completed') {
            clearInterval(statusIntervalRef.current)
            setSuccessMessage('Download completed successfully!')
            
            // Add to history
            setDownloadHistory(prev => [{
              jobId: id,
              filename: filename,
              platform,
              completedAt: new Date(),
              status: 'completed'
            }, ...prev].slice(0, 10)) // Keep last 10
            
            // Remove from active
            setActiveDownloads(prev => prev.filter(d => d.jobId !== id))
          } 
          else if (jobData.state === 'failed') {
            clearInterval(statusIntervalRef.current)
            setError(`Download failed: ${jobData.message || 'Unknown error'}`)
            
            // Add to history as failed
            setDownloadHistory(prev => [{
              jobId: id,
              filename: filename,
              platform,
              completedAt: new Date(),
              status: 'failed'
            }, ...prev].slice(0, 10))
            
            // Remove from active
            setActiveDownloads(prev => prev.filter(d => d.jobId !== id))
          }

          consecutiveErrors = 0
        }
      } catch (err) {
        consecutiveErrors++
        console.error('Status check error:', err)
        
        if (consecutiveErrors >= maxErrors) {
          clearInterval(statusIntervalRef.current)
          setError('Lost connection to server. Check status later.')
        }
      }
    }, 1500) // Poll every 1.5 seconds
  }

  const getStatusMessage = (state) => {
    const messages = {
      queued: 'Waiting in queue...',
      active: 'Downloading...',
      processing: 'Processing...',
      completed: 'Download completed!',
      failed: 'Download failed',
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
        
        if (statusIntervalRef.current) {
          clearInterval(statusIntervalRef.current)
        }
        
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

  const getPlatformIcon = (platformName) => {
    const icons = {
      instagram: <FaInstagram />,
      tiktok: <FaTiktok />,
      twitter: <FaTwitter />,
      facebook: <FaFacebook />,
      pinterest: <FaPinterest />,
    }
    return icons[platformName?.toLowerCase()] || <MdDownload />
  }

  const resetForm = () => {
    setUrl('')
    setPlatform(null)
    setMetadata(null)
    setFormats([])
    setSelectedFormat('best')
    setError(null)
    setSuccessMessage('')
    setJobId(null)
    setDownloadStatus(null)
    setFileSize(null)
    setFilename('')
    setShowDownloadModal(false)
  }

  return (
    <div className="home-page">
      <Hero 
        url={url}
        setUrl={setUrl}
        handleDetectPlatform={handleDetectPlatform}
        loading={loading}
        error={error}
        platform={platform}
        getPlatformIcon={getPlatformIcon}
      />

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
      {(metadata || formats.length > 0 || downloadStatus) && (
        <section id="download" className="download-section">
          <div className="container">
            {metadata && (
              <div className="metadata-card">
                {metadata.thumbnail && (
                  <img src={metadata.thumbnail} alt={metadata.title} className="thumbnail" />
                )}
                <div className="metadata-content">
                  <h3>{metadata.title || 'Untitled'}</h3>
                  {metadata.uploader && <p className="uploader">By: {metadata.uploader}</p>}
                  {metadata.duration && (
                    <p className="duration">
                      <HiClock className="duration-icon" />
                      {Math.floor(metadata.duration / 60)}:{(metadata.duration % 60).toString().padStart(2, '0')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {formats.length > 0 && (
              <div className="formats-section">
                <h4>Available Formats</h4>
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
                        {format.resolution && <span>{format.resolution}</span>}
                        {format.filesize && (
                          <span>{(format.filesize / 1024 / 1024).toFixed(2)} MB</span>
                        )}
                      </div>
                      <button
                        className="btn-check-size"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCheckFileSize()
                        }}
                      >
                        Check Size
                      </button>
                    </div>
                  ))}
                </div>

                {fileSize && (
                  <div className="file-size-info">
                    <p>Estimated Size: <strong>{fileSize.sizeMB} MB</strong></p>
                    {!fileSize.canDownload && (
                      <p className="warning">
                        <HiExclamationCircle /> File exceeds maximum allowed size ({fileSize.maxAllowedMB} MB)
                      </p>
                    )}
                  </div>
                )}

                {/* Download Filename Input */}
                <div className="filename-section">
                  <label htmlFor="filename">Download Filename</label>
                  <div className="filename-input-group">
                    <input
                      id="filename"
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
                  <button className="btn btn-tertiary" onClick={resetForm}>
                    Clear
                  </button>
                </div>
              </div>
            )}

            {downloadStatus && (
              <div className="download-status-section">
                <h4>Download Status</h4>
                <div className="status-card">
                  <div className="status-header">
                    <div className="status-info">
                      <span className={`status-badge ${downloadStatus.state}`}>
                        {downloadStatus.state.toUpperCase()}
                      </span>
                      <span className="job-id">ID: {jobId?.slice(0, 8)}...</span>
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
                          Download Another
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
                            Start Over
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
        </section>
      )}

      {/* Supported Platforms Section */}
      <section className="supported-platforms-section">
        <div className="container">
          <h3>Supported Platforms</h3>
          <div className="platforms-grid">
            <div className="platform-card">
              <FaInstagram className="platform-icon" />
              <h4>Instagram</h4>
              <p>Reels, Posts, Stories</p>
            </div>
            <div className="platform-card">
              <FaTiktok className="platform-icon" />
              <h4>TikTok</h4>
              <p>Videos</p>
            </div>
            <div className="platform-card">
              <FaTwitter className="platform-icon" />
              <h4>Twitter/X</h4>
              <p>Videos, Images, Gifs</p>
            </div>
            <div className="platform-card">
              <FaFacebook className="platform-icon" />
              <h4>Facebook</h4>
              <p>Videos, Photos</p>
            </div>
            <div className="platform-card">
              <FaPinterest className="platform-icon" />
              <h4>Pinterest</h4>
              <p>Images, Videos</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
