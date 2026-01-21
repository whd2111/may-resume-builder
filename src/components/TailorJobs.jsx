import { useState } from 'react'
import Stage2Tailor from './Stage2Tailor'
import BatchTailor from './BatchTailor'

function TailorJobs({ apiKey, masterResume, onBack }) {
  const [mode, setMode] = useState(null) // null, 'single', 'batch'

  if (mode === 'single') {
    return (
      <Stage2Tailor
        apiKey={apiKey}
        masterResume={masterResume}
        onBack={() => setMode(null)}
      />
    )
  }

  if (mode === 'batch') {
    return (
      <BatchTailor
        apiKey={apiKey}
        masterResume={masterResume}
        onBack={() => setMode(null)}
      />
    )
  }

  if (!masterResume) {
    return (
      <div className="container">
        <div className="page-header">
          <button className="back-button" onClick={onBack}>
            ← Back to Home
          </button>
          <h1 className="page-title">Tailor for Jobs</h1>
          <p className="page-subtitle">Customize your resume for specific roles</p>
        </div>

        <div className="card">
          <div className="info-box" style={{ borderColor: '#ff6b6b', background: '#ffe0e0' }}>
            <div className="info-box-text" style={{ color: '#c92a2a' }}>
              No primary 1-page resume found. Please build a resume first before tailoring.
            </div>
          </div>
          <button className="btn btn-secondary" onClick={onBack} style={{ marginTop: 'var(--space-lg)' }}>
            Go Build a Resume
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="page-header">
        <button className="back-button" onClick={onBack}>
          ← Back to Home
        </button>
        <h1 className="page-title">Tailor for Jobs</h1>
        <p className="page-subtitle">Customize your resume for specific job opportunities</p>
      </div>

      <div className="action-cards" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="action-card" onClick={() => setMode('single')}>
          <span className="action-card-icon">🎯</span>
          <h2 className="action-card-title">Single Job</h2>
          <p className="action-card-description">
            Tailor your resume for one specific role. Paste a job description and May will customize your resume to match that position perfectly.
          </p>
        </div>

        <div className="action-card" onClick={() => setMode('batch')}>
          <span className="action-card-icon">⚡</span>
          <h2 className="action-card-title">Multiple Jobs</h2>
          <p className="action-card-description">
            Applying to several positions? Paste multiple job descriptions and May will create a tailored resume for each one automatically. Great for high-volume job searches.
          </p>
        </div>
      </div>
    </div>
  )
}

export default TailorJobs
