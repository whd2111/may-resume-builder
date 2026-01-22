import { useState } from 'react'
import Stage2Tailor from './Stage2Tailor'
import BatchTailor from './BatchTailor'
import { ArrowLeftIcon, TargetIcon, WritingIcon } from '../utils/icons'

function TailorJobs({ primaryResume, onBack, onNavigate }) {
  const [mode, setMode] = useState(null) // null, 'single', 'batch'

  if (mode === 'single') {
    return (
      <Stage2Tailor
          primaryResume={primaryResume}
        onBack={() => setMode(null)}
        onNavigate={onNavigate}
      />
    )
  }

  if (mode === 'batch') {
    return (
      <BatchTailor
          primaryResume={primaryResume}
        onBack={() => setMode(null)}
        onNavigate={onNavigate}
      />
    )
  }

  if (!primaryResume) {
    return (
      <div className="container">
        <div className="page-header">
          {onBack && (
            <button className="back-button" onClick={onBack}>
              <ArrowLeftIcon />
              Back to Home
            </button>
          )}
          <h1 className="page-title">Tailor for Jobs</h1>
          <p className="page-subtitle">Customize your resume for specific roles</p>
        </div>

        <div className="card-premium" style={{ borderLeft: '4px solid #ef4444' }}>
          <p style={{ color: '#b91c1c', fontWeight: '500' }}>
            No primary resume found. Please build one first to enable tailoring.
          </p>
          <button className="btn btn-primary" onClick={() => onNavigate('build')} style={{ marginTop: 'var(--space-md)' }}>
            Go to Resume Builder
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <nav className="nav-bar">
        {onBack && (
          <button className="back-button" onClick={onBack}>
            <ArrowLeftIcon />
            Back to Home
          </button>
        )}
        <div className="logo" style={{ fontSize: '24px', margin: 0 }}>May</div>
      </nav>

      <div className="page-header">
        <h1 className="page-title">Tailor for Jobs</h1>
        <p className="page-subtitle">How many roles are you applying for?</p>
      </div>

      <div className="action-cards" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="action-card stagger-1" onClick={() => setMode('single')}>
          <span className="action-card-icon">
            <TargetIcon />
          </span>
          <h2 className="action-card-title">Single Job</h2>
          <p className="action-card-description">
            Tailor your resume for one specific role. Paste a job description and May will customize your resume to match.
          </p>
        </div>

        <div className="action-card stagger-2" onClick={() => setMode('batch')}>
          <span className="action-card-icon">
            <WritingIcon />
          </span>
          <h2 className="action-card-title">Multiple Jobs</h2>
          <p className="action-card-description">
            Applying to several positions? Paste multiple job descriptions and May will create a tailored resume for each one automatically.
          </p>
        </div>
      </div>
    </div>
  )
}

export default TailorJobs
