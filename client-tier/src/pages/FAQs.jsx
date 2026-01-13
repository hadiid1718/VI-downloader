import { useState } from 'react'
import { Link } from 'react-router-dom'
import '../styles/FAQs.css'

const FAQs = () => {
  const [openIndex, setOpenIndex] = useState(null)

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  const faqs = [
    {
      question: 'What platforms does VI Downloader support?',
      answer: 'VI Downloader supports Instagram (Reels, Posts, Stories, IGTV), TikTok (Videos), Twitter/X (Videos, Images, GIFs), Facebook (Videos, Photos), and Pinterest (Images, Videos). We continuously work on adding support for more platforms.'
    },
    {
      question: 'Is VI Downloader free to use?',
      answer: 'Yes, VI Downloader is completely free to use. There are no hidden fees, subscriptions, or registration requirements. You can download as many videos and images as you want without any cost.'
    },
    {
      question: 'Do I need to create an account?',
      answer: 'No, you do not need to create an account or register to use VI Downloader. Simply paste the URL and start downloading. This makes the process quick and hassle-free.'
    },
    {
      question: 'How do I download a video or image?',
      answer: 'The process is simple: 1) Copy the URL of the video/image you want to download, 2) Paste it into our platform and click "Analyze URL", 3) Select your preferred format, 4) Click "Start Download" and monitor the progress. Once completed, your file will be ready.'
    },
    {
      question: 'What file formats are available?',
      answer: 'Available formats depend on the source platform and media type. Common formats include MP4 for videos and JPG/PNG for images. You can see all available formats after analyzing a URL, including resolution options and file sizes.'
    },
    {
      question: 'Is there a file size limit?',
      answer: 'Yes, there is a maximum file size limit of 500 MB per download. Before starting a download, you can check the estimated file size to ensure it meets your requirements and our limits.'
    },
    {
      question: 'How long does a download take?',
      answer: 'Download time varies depending on file size, format, server load, and your internet connection. Small files (under 50 MB) typically complete in seconds, while larger files may take a few minutes. You can monitor progress in real-time using the progress bar.'
    },
    {
      question: 'Can I cancel a download?',
      answer: 'Yes, you can cancel an active download by clicking the "Cancel Download" button in the download status section. However, once a download is completed, it cannot be cancelled.'
    },
    {
      question: 'What should I do if a download fails?',
      answer: 'If a download fails, first check that the URL is correct and the content is publicly accessible. Try the download again. If it continues to fail, it may be due to platform restrictions or server issues. Check our status page or try again later.'
    },
    {
      question: 'Can I download private or protected content?',
      answer: 'No, VI Downloader can only download publicly accessible content. If a video or image is private, protected, or requires authentication, it cannot be downloaded through our platform. You must have permission to access the content.'
    },
    {
      question: 'Are there any rate limits?',
      answer: 'Yes, to ensure fair usage and prevent abuse, we implement rate limiting. Users can make 100 requests per 15 minutes. This helps maintain service quality for all users.'
    },
    {
      question: 'Is my data stored or tracked?',
      answer: 'We prioritize user privacy. URLs are processed temporarily and are not stored permanently. We do not track personal information or store your download history. Your privacy is important to us.'
    },
    {
      question: 'Can I download in batch?',
      answer: 'Currently, VI Downloader supports single downloads. You need to download each video or image separately. Batch download functionality may be added in future updates.'
    },
    {
      question: 'Why is my download stuck at a certain percentage?',
      answer: 'If a download appears stuck, it may be due to network issues, server load, or source platform restrictions. Try canceling and restarting the download. If the problem persists, wait a few minutes and try again.'
    },
    {
      question: 'Does VI Downloader add watermarks?',
      answer: 'No, VI Downloader does not add any watermarks to downloaded content. Files are downloaded exactly as they appear on the source platform, maintaining original quality and without any modifications.'
    },
    {
      question: 'Can I download live videos or streams?',
      answer: 'No, VI Downloader currently supports only pre-recorded content. Live videos or ongoing streams cannot be downloaded. Only videos that have been published and are available as static content can be downloaded.'
    },
    {
      question: 'What browsers are supported?',
      answer: 'VI Downloader works on all modern browsers including Chrome, Firefox, Safari, Edge, and Opera. Ensure your browser is updated to the latest version for the best experience.'
    },
    {
      question: 'Is VI Downloader available as a mobile app?',
      answer: 'Currently, VI Downloader is available as a web application accessible through any browser on desktop and mobile devices. Native mobile apps may be developed in the future.'
    },
    {
      question: 'Can I download entire playlists or collections?',
      answer: 'Currently, VI Downloader supports individual media downloads. Playlist or collection downloads are not available, but each item can be downloaded separately by pasting its individual URL.'
    },
    {
      question: 'What happens if the source platform changes their URL format?',
      answer: 'We continuously monitor platform changes and update our system accordingly. If you encounter issues with a specific platform, it may be due to recent changes. Please report any issues, and we will work to resolve them quickly.'
    }
  ]

  return (
    <div className="faqs-page">
      <div className="faqs-hero">
        <div className="container">
          <h1>Frequently Asked Questions</h1>
          <p className="hero-subtitle">
            Find answers to common questions about VI Downloader
          </p>
        </div>
      </div>

      <section className="faqs-section">
        <div className="container">
          <div className="faqs-container">
            {faqs.map((faq, index) => (
              <div key={index} className={`faq-item ${openIndex === index ? 'open' : ''}`}>
                <button
                  className="faq-question"
                  onClick={() => toggleFAQ(index)}
                  aria-expanded={openIndex === index}
                >
                  <span>{faq.question}</span>
                  <svg
                    className={`faq-icon ${openIndex === index ? 'open' : ''}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M6 9L12 15L18 9"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <div className="faq-answer">
                  <p>{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="faqs-cta">
            <h2>Still have questions?</h2>
            <p>If you couldn't find the answer you're looking for, feel free to reach out to us.</p>
            <div className="cta-buttons">
              <Link to="/about" className="btn btn-primary">
                Learn More
              </Link>
              <Link to="/" className="btn btn-secondary">
                Start Downloading
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default FAQs
