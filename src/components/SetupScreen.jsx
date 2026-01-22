import { useState } from 'react'

function SetupScreen({ onApiKeySubmit, hasExistingResume }) {
  const [apiKey, setApiKey] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (apiKey.trim()) {
      onApiKeySubmit(apiKey.trim())
    }
  }

  return (
    <div className="container">
      <div className="header">
        <div className="logo">May</div>
        <p className="tagline">Your AI-Era Resume</p>
      </div>

      {hasExistingResume && (
        <div className="info-text">
          You have an existing resume saved. Enter your API key to continue.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="apiKey">Claude API Key</label>
          <input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            required
          />
          <small style={{ color: '#666', marginTop: '8px', display: 'block' }}>
            Get your API key from <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>console.anthropic.com</a>
          </small>
        </div>

        <button type="submit" className="button" disabled={!apiKey.trim()}>
          {hasExistingResume ? 'Continue to Tailoring' : 'Start Building Resume'}
        </button>
      </form>

      <div style={{ marginTop: '40px', padding: '20px', background: '#f9f9f9', borderRadius: '12px' }}>
        <h3 style={{ marginBottom: '16px', color: '#333' }}>How May Works:</h3>
        <ol style={{ marginLeft: '20px', color: '#666', lineHeight: '1.8' }}>
          <li><strong>Stage 1:</strong> Chat with May to build your primary 1-page resume. May asks strategic questions about your experience, projects, and achievements.</li>
          <li><strong>Stage 2:</strong> Input any job description, and May tailors your resume specifically for that role.</li>
        </ol>
      </div>
    </div>
  )
}

export default SetupScreen
