import { useState } from 'react'

function LinkedInImport({ onImportComplete, onSkip }) {
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')

  const handleImport = async () => {
    if (!linkedinUrl.trim()) {
      setError('Please enter a LinkedIn URL')
      return
    }

    if (!linkedinUrl.includes('linkedin.com/in/')) {
      setError('Please enter a valid LinkedIn profile URL')
      return
    }

    setIsProcessing(true)
    setError('')

    try {
      // This will be handled by the parent component
      // For now, we'll just pass the URL up
      onImportComplete({ linkedinUrl, method: 'manual' })
    } catch (err) {
      setError(`Error: ${err.message}`)
      setIsProcessing(false)
    }
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Import from LinkedIn (Optional)</h1>
        <p className="page-subtitle">
          Provide your LinkedIn URL to pre-fill your education and work history, or skip to enter manually
        </p>
      </div>

      <div className="card">
        <div className="card-title">LinkedIn Profile URL</div>
        <input
          type="text"
          placeholder="https://linkedin.com/in/yourprofile"
          value={linkedinUrl}
          onChange={(e) => setLinkedinUrl(e.target.value)}
          className="input-field"
          style={{ marginBottom: 'var(--space-lg)', width: '100%' }}
          onKeyPress={(e) => {
            if (e.key === 'Enter') handleImport()
          }}
        />

        {error && (
          <div className="info-box" style={{ borderColor: '#ff6b6b', background: '#ffe0e0', marginBottom: 'var(--space-lg)' }}>
            <div className="info-box-text" style={{ color: '#c92a2a' }}>
              {error}
            </div>
          </div>
        )}

        <div className="button-group">
          <button className="btn btn-secondary" onClick={onSkip}>
            Skip - Enter Manually
          </button>
          <button
            className="btn btn-primary"
            onClick={handleImport}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <span className="loading-spinner"></span> Importing...
              </>
            ) : (
              'Import from LinkedIn'
            )}
          </button>
        </div>
      </div>

      <div className="info-box">
        <div className="info-box-title">How it works:</div>
        <div className="info-box-text">
          • May will review your LinkedIn profile to extract education and work history
          <br />
          • You'll be able to review and confirm the information before proceeding
          <br />
          • Your LinkedIn credentials are never stored or shared
          <br />
          • You can always edit the information later in the chat
        </div>
      </div>
    </div>
  )
}

export default LinkedInImport
