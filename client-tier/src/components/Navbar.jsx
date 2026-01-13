import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HiHome, HiInformationCircle, HiQuestionMarkCircle } from 'react-icons/hi'
import { MdDownload } from 'react-icons/md'
import '../styles/Navbar.css'

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  return (
    <nav className="navbar glass">
      <div className="nav-container">
        <Link to="/" className="nav-logo" onClick={closeMenu}>
          <MdDownload className="logo-icon" />
          <span>VI Downloader</span>
        </Link>
        
        <div className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
          <Link to="/" className="nav-link" onClick={closeMenu}>
            <HiHome className="nav-icon" />
            <span>Home</span>
          </Link>
          <Link to="/about" className="nav-link" onClick={closeMenu}>
            <HiInformationCircle className="nav-icon" />
            <span>About</span>
          </Link>
          <Link to="/faqs" className="nav-link" onClick={closeMenu}>
            <HiQuestionMarkCircle className="nav-icon" />
            <span>FAQs</span>
          </Link>
        </div>

        <div className="nav-toggle" onClick={toggleMenu}>
          <span className={`bar ${isMenuOpen ? 'active' : ''}`}></span>
          <span className={`bar ${isMenuOpen ? 'active' : ''}`}></span>
          <span className={`bar ${isMenuOpen ? 'active' : ''}`}></span>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
