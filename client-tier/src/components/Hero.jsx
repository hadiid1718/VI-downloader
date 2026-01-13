import { Link } from 'react-router-dom'
import { MdDownload, MdInfoOutline, MdSearch } from 'react-icons/md'
import { FaInfinity, FaBolt } from 'react-icons/fa'
import { HiSparkles, HiExclamationCircle } from 'react-icons/hi'
import '../styles/Hero.css'

const Hero = ({ 
  url, 
  setUrl, 
  handleDetectPlatform, 
  loading, 
  error,
  platform,
  getPlatformIcon
}) => {
  return (
    <section className="hero">
      <div className="hero-container">
        <div className="hero-content">
          <h1 className="hero-title">
            <span>Download Videos & Images</span>
            <span className="hero-highlight">From Any Platform</span>
          </h1>
          <p className="hero-description">
            Experience the fastest, most intuitive way to download videos and images from Instagram, 
            TikTok, Twitter, Facebook, Pinterest and more. Free forever, no sign-up required.
          </p>
          
          {/* Download Form in Hero */}
          <div className="hero-download-form">
            <div className="input-group">
              <input
                type="url"
                className="url-input"
                placeholder="Paste URL here... https://www.instagram.com/reel/ABC123/"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleDetectPlatform()}
              />
              <button
                className="btn btn-primary btn-analyze"
                onClick={handleDetectPlatform}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <MdSearch className="btn-icon" />
                    <span>Analyze URL</span>
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="error-message">
                <HiExclamationCircle className="error-icon" />
                {error}
              </div>
            )}

            {platform && (
              <div className="platform-detected">
                <div className="platform-badge">
                  {getPlatformIcon(platform)}
                  <span>Platform: {platform.charAt(0).toUpperCase() + platform.slice(1)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="hero-buttons">
            <Link to="/about" className="btn btn-secondary">
              <MdInfoOutline className="btn-icon" />
              <span>Learn How It Works</span>
            </Link>
          </div>
          
          <div className="hero-stats">
            <div className="stat-item">
              <HiSparkles className="stat-icon" />
              <span className="stat-number">5+</span>
              <span className="stat-label">Platforms</span>
            </div>
            <div className="stat-item">
              <HiSparkles className="stat-icon" />
              <span className="stat-number">100%</span>
              <span className="stat-label">Free</span>
            </div>
            <div className="stat-item">
              <FaInfinity className="stat-icon" />
              <span className="stat-number">∞</span>
              <span className="stat-label">Unlimited</span>
            </div>
            <div className="stat-item">
              <FaBolt className="stat-icon" />
              <span className="stat-label">Fast</span>
            </div>
          </div>
        </div>
        <div className="hero-image">
          <div className="hero-visual">
            <div className="visual-card card-1"></div>
            <div className="visual-card card-2"></div>
            <div className="visual-card card-3"></div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
