import { useState } from 'react'
import Stage1Chatbot from './Stage1Chatbot'
import ResumeUpload from './ResumeUpload'

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
        onBack={() => setMode(null)}
      />
    )
  }

  return (
    <div className="container">
      <div className="page-header">
        <button className="back-button" onClick={onBack}>
          ← Back to Home
        </button>
        <h1 className="page-title">Build Your Resume</h1>
        <p className="page-subtitle">Choose how you'd like to create your resume</p>
      </div>

      <div className="action-cards" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="action-card" onClick={() => setMode('chat')}>
          <span className="action-card-icon">💬</span>
          <h2 className="action-card-title">Start from Scratch</h2>
          <p className="action-card-description">
            Chat with May to build your resume from the ground up. She'll ask strategic questions to extract your best accomplishments and create a professional resume.
          </p>
        </div>

        <div className="action-card" onClick={() => setMode('upload')}>
          <span className="action-card-icon">📄</span>
          <h2 className="action-card-title">Upload Existing Resume</h2>
          <p className="action-card-description">
            Already have a resume? Upload it and May will rewrite it using best practices: strong action verbs, metrics, and the "did X by Y as shown by Z" framework.
          </p>
        </div>
      </div>
    </div>
  )
}

export default BuildResume
