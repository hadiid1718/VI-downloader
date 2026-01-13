import { Link } from 'react-router-dom'
import { MdDownload } from 'react-icons/md'
import { FaGithub, FaTwitter, FaLinkedin, FaInstagram, FaTiktok, FaPinterest, FaFacebook } from 'react-icons/fa'
import '../styles/Footer.css'

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3 className="footer-title">
            <MdDownload className="footer-logo-icon" />
            <span>VI Downloader</span>
          </h3>
          <p className="footer-description">
            Download videos and images from your favorite social media platforms quickly and easily.
          </p>
        </div>

        <div className="footer-section">
          <h4 className="footer-heading">Quick Links</h4>
          <ul className="footer-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About</Link></li>
            <li><Link to="/faqs">FAQs</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4 className="footer-heading">Supported Platforms</h4>
          <ul className="footer-links">
            <li><FaInstagram className="platform-icon" /> Instagram</li>
            <li><FaFacebook className="platform-icon" /> Facebook</li>
            <li><FaTwitter className="platform-icon" /> Twitter</li>
            <li><FaPinterest className="platform-icon" /> Pinterest</li>
            <li><FaTiktok className="platform-icon" /> TikTok</li>
          </ul>
        </div>

        <div className="footer-section">
          <h4 className="footer-heading">Connect</h4>
          <div className="social-links">
            <a href="#" className="social-link" aria-label="GitHub">
              <FaGithub />
            </a>
            <a href="#" className="social-link" aria-label="Twitter">
              <FaTwitter />
            </a>
            <a href="#" className="social-link" aria-label="LinkedIn">
              <FaLinkedin />
            </a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; 2025 VI Downloader. All rights reserved.</p>
      </div>
    </footer>
  )
}

export default Footer
