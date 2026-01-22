import { useState } from 'react'
import Stage1Chatbot from './Stage1Chatbot'
import ResumeUpload from './ResumeUpload'
import { ArrowLeftIcon, WritingIcon, DownloadIcon } from '../utils/icons'

function BuildResume({ onResumeComplete, onBack, existingResume }) {
  const [mode, setMode] = useState(null) // null, 'chat', 'upload'

  if (mode === 'chat') {
    return (
      <Stage1Chatbot
        onResumeComplete={onResumeComplete}
        onBack={() => setMode(null)}
        existingResume={existingResume}
      />
    )
  }

  if (mode === 'upload') {
    return (
      <ResumeUpload
        onResumeComplete={onResumeComplete}
        onBack={() => setMode(null)}
      />
    )
  }

  return (
    <div className="container">
      <nav className="nav-bar">
        <button className="back-button" onClick={onBack}>
          <ArrowLeftIcon />
          Back to Home
        </button>
        <div className="logo" style={{ fontSize: '24px', margin: 0 }}>May</div>
      </nav>

      <div className="page-header">
        <h1 className="page-title">Build Your Resume</h1>
        <p className="page-subtitle">How would you like to create your professional resume?</p>
      </div>

      <div className="action-cards" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="action-card stagger-1" onClick={() => setMode('chat')}>
          <span className="action-card-icon">
            <WritingIcon />
          </span>
          <h2 className="action-card-title">Start from Scratch</h2>
          <p className="action-card-description">
            Chat with May to build your resume from the ground up. She'll ask strategic questions to extract your best achievements.
          </p>
        </div>

        <div className="action-card stagger-2" onClick={() => setMode('upload')}>
          <span className="action-card-icon">
            <DownloadIcon />
          </span>
          <h2 className="action-card-title">Upload Existing Resume</h2>
          <p className="action-card-description">
            Upload your current resume and May will rewrite it using industry best practices and impactful metrics.
          </p>
        </div>
      </div>
    </div>
  )
}

export default BuildResume
