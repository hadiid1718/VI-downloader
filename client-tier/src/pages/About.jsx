import { Link } from 'react-router-dom'
import { FaInstagram, FaTiktok, FaTwitter, FaFacebook, FaPinterest } from 'react-icons/fa'
import { HiLightBulb, HiCheckCircle, HiClock, HiLockClosed, HiDownload, HiServer, HiGlobe, HiSparkles } from 'react-icons/hi'
import '../styles/About.css'

const About = () => {
  return (
    <div className="about-page">
      <div className="about-hero">
        <div className="container">
          <h1>About VI Downloader</h1>
          <p className="hero-subtitle">
            Your one-stop solution for downloading videos and images from popular social media platforms
          </p>
        </div>
      </div>

      <section className="about-section">
        <div className="container">
          <div className="content-block">
            <h2>What is VI Downloader?</h2>
            <p>
              VI Downloader is a powerful, free, and easy-to-use platform that allows you to download 
              videos and images from multiple social media platforms including Instagram, TikTok, Twitter, 
              Facebook, and Pinterest. No registration required, no watermarks, just fast and reliable downloads.
            </p>
          </div>

          <div className="content-block">
            <h2>How to Use Our Platform</h2>
            <div className="steps-container">
              <div className="step-card">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h3>Copy the URL</h3>
                  <p>
                    Navigate to the video or image you want to download on any supported platform. 
                    Copy the URL from your browser's address bar or use the share button to get the link.
                  </p>
                  <div className="step-example">
                    <strong>Example URLs:</strong>
                    <ul>
                      <li>Instagram: <code>https://www.instagram.com/reel/ABC123/</code></li>
                      <li>TikTok: <code>https://www.tiktok.com/@user/video/123456</code></li>
                      <li>Twitter: <code>https://twitter.com/user/status/123456</code></li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="step-card">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h3>Paste and Analyze</h3>
                  <p>
                    Go to our homepage and paste the copied URL into the input field. Click "Analyze URL" 
                    to let our system detect the platform and extract media information.
                  </p>
                  <div className="step-example">
                    <p>Our system will automatically:</p>
                    <ul>
                      <li><HiCheckCircle className="inline-icon" /> Detect the platform</li>
                      <li><HiCheckCircle className="inline-icon" /> Extract media metadata (title, thumbnail, duration)</li>
                      <li><HiCheckCircle className="inline-icon" /> Show available download formats</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="step-card">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h3>Select Format</h3>
                  <p>
                    Choose your preferred download format from the available options. You can see the 
                    resolution, file size, and format type for each option. Check the file size to ensure 
                    it meets your requirements.
                  </p>
                  <div className="step-example">
                    <p><strong>Format Options:</strong></p>
                    <ul>
                      <li><HiCheckCircle className="inline-icon" /> Best Quality (recommended)</li>
                      <li><HiCheckCircle className="inline-icon" /> Various resolutions (1080p, 720p, etc.)</li>
                      <li><HiCheckCircle className="inline-icon" /> Different file formats (MP4, WebM, etc.)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="step-card">
                <div className="step-number">4</div>
                <div className="step-content">
                  <h3>Start Download</h3>
                  <p>
                    Click "Start Download" to queue your download. You'll receive a job ID to track the 
                    progress. The download will be processed in the background, and you can monitor the 
                    status in real-time.
                  </p>
                  <div className="step-example">
                    <p><strong>Download Features:</strong></p>
                    <ul>
                      <li><HiCheckCircle className="inline-icon" /> Real-time progress tracking</li>
                      <li><HiCheckCircle className="inline-icon" /> Queue management</li>
                      <li><HiCheckCircle className="inline-icon" /> Automatic retry on failure</li>
                      <li><HiCheckCircle className="inline-icon" /> Cancel option for active downloads</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="step-card">
                <div className="step-number">5</div>
                <div className="step-content">
                  <h3>Monitor Progress</h3>
                  <p>
                    Track your download status with our progress indicator. Once completed, you'll be 
                    notified, and the file will be ready for download.
                  </p>
                  <div className="step-example">
                    <p><strong>Status States:</strong></p>
                    <ul>
                      <li><span className="status-waiting">Waiting</span> - In queue</li>
                      <li><span className="status-active">Active</span> - Currently downloading</li>
                      <li><span className="status-completed">Completed</span> - Ready for download</li>
                      <li><span className="status-failed">Failed</span> - Error occurred (retry available)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="content-block">
            <h2>Platform-Specific Instructions</h2>
            <div className="platform-instructions">
              <div className="instruction-card">
                <div className="platform-header">
                  <FaInstagram className="platform-icon" />
                  <h3>Instagram</h3>
                </div>
                <ul>
                  <li>Open the post, reel, or story you want to download</li>
                  <li>Click the three dots (...) menu and select "Copy Link"</li>
                  <li>Paste the link into our platform</li>
                  <li><strong>Supported:</strong> Posts, Reels, Stories, IGTV</li>
                </ul>
              </div>

              <div className="instruction-card">
                <div className="platform-header">
                  <FaTiktok className="platform-icon" />
                  <h3>TikTok</h3>
                </div>
                <ul>
                  <li>Open the TikTok video you want to download</li>
                  <li>Click the "Share" button and select "Copy Link"</li>
                  <li>Paste the link into our platform</li>
                  <li><strong>Supported:</strong> Regular videos, Duets</li>
                </ul>
              </div>

              <div className="instruction-card">
                <div className="platform-header">
                  <FaTwitter className="platform-icon" />
                  <h3>Twitter/X</h3>
                </div>
                <ul>
                  <li>Open the tweet with the media you want to download</li>
                  <li>Click the "Share" icon and copy the tweet link</li>
                  <li>Paste the link into our platform</li>
                  <li><strong>Supported:</strong> Videos, Images, GIFs</li>
                </ul>
              </div>

              <div className="instruction-card">
                <div className="platform-header">
                  <FaFacebook className="platform-icon" />
                  <h3>Facebook</h3>
                </div>
                <ul>
                  <li>Open the video or photo you want to download</li>
                  <li>Copy the URL from your browser's address bar</li>
                  <li>Paste the link into our platform</li>
                  <li><strong>Supported:</strong> Videos, Photos, Posts</li>
                </ul>
              </div>

              <div className="instruction-card">
                <div className="platform-header">
                  <FaPinterest className="platform-icon" />
                  <h3>Pinterest</h3>
                </div>
                <ul>
                  <li>Open the pin you want to download</li>
                  <li>Click the "Send" button and copy the pin URL</li>
                  <li>Paste the link into our platform</li>
                  <li><strong>Supported:</strong> Images, Videos, Pins</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="content-block">
            <h2>Features</h2>
            <div className="features-grid">
              <div className="feature-item">
                <HiSparkles className="feature-icon" />
                <h4>Fast Processing</h4>
                <p>Quick analysis and download queue system</p>
              </div>
              <div className="feature-item">
                <HiServer className="feature-icon" />
                <h4>Multiple Formats</h4>
                <p>Choose from various quality options</p>
              </div>
              <div className="feature-item">
                <HiLockClosed className="feature-icon" />
                <h4>No Registration</h4>
                <p>Use without creating an account</p>
              </div>
              <div className="feature-item">
                <HiClock className="feature-icon" />
                <h4>Progress Tracking</h4>
                <p>Real-time download status updates</p>
              </div>
              <div className="feature-item">
                <HiGlobe className="feature-icon" />
                <h4>Free to Use</h4>
                <p>No hidden fees or subscriptions</p>
              </div>
              <div className="feature-item">
                <HiDownload className="feature-icon" />
                <h4>Multiple Platforms</h4>
                <p>Support for 5+ social media platforms</p>
              </div>
            </div>
          </div>

          <div className="content-block">
            <h2>Tips for Best Results</h2>
            <ul className="tips-list">
              <li>
                <HiLightBulb className="tip-icon" />
                <span>Ensure the URL you copy is complete and includes the media identifier</span>
              </li>
              <li>
                <HiLightBulb className="tip-icon" />
                <span>Check that the content is public and accessible</span>
              </li>
              <li>
                <HiLightBulb className="tip-icon" />
                <span>Select appropriate format based on your needs (balance between quality and file size)</span>
              </li>
              <li>
                <HiLightBulb className="tip-icon" />
                <span>Monitor download progress for large files</span>
              </li>
              <li>
                <HiLightBulb className="tip-icon" />
                <span>If download fails, check the URL and try again</span>
              </li>
            </ul>
          </div>

          <div className="content-block cta-section">
            <h2>Ready to Get Started?</h2>
            <p>Start downloading your favorite videos and images now!</p>
            <Link to="/" className="btn btn-primary btn-large">
              Start Downloading
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default About
