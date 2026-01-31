import { useState } from 'react'
import '../App.css'
import { WritingIcon, TargetIcon } from '../utils/icons'
import { useAuth } from '../contexts/AuthContext'
import AuthModal from './auth/AuthModal'

function Home({ onNavigate, user, hasPrimaryResume }) {
  const { signOut } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      setShowUserMenu(false)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    if (password === 'resume') {
      // Show admin menu instead of going directly to resume bank
      setShowPasswordPrompt(false)
      setShowAdminMenu(true)
      setPassword('')
      setPasswordError(false)
    } else {
      setPasswordError(true)
    }
  }

  const [showAdminMenu, setShowAdminMenu] = useState(false)

  const handleAdminAction = (action) => {
    setShowAdminMenu(false)
    onNavigate(action)
  }

  return (
    <div className="home-container">
      <div className="home-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '900px', marginBottom: 'var(--space-lg)' }}>
          <div style={{ flex: 1 }} />
          
          {user ? (
            <div className="user-menu">
              <button 
                className="user-button" 
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <span className="user-avatar">
                  {user.email?.[0]?.toUpperCase() || 'U'}
                </span>
                <span>{user.email?.split('@')[0]}</span>
              </button>
              
              {showUserMenu && (
                <div className="user-dropdown">
                  <button onClick={() => { onNavigate('dashboard'); setShowUserMenu(false); }}>
                    Dashboard
                  </button>
                  <button onClick={handleSignOut}>Sign Out</button>
                </div>
              )}
            </div>
          ) : (
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowAuthModal(true)}
            >
              Sign In
            </button>
          )}
        </div>

        <h1 className="logo">May</h1>
        <p className="tagline">Your AI-Era Resume</p>
        
        {user && hasPrimaryResume && (
          <p style={{ color: 'var(--text-tertiary)', fontSize: '14px', marginTop: 'var(--space-sm)' }}>
            ✓ Main resume saved
          </p>
        )}
      </div>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      <div className="action-cards">
        <div className="action-card stagger-1" onClick={() => onNavigate('build')}>
          <span className="action-card-icon">
            <WritingIcon />
          </span>
          <h2 className="action-card-title">Build Your Resume</h2>
          <p className="action-card-description">
            Create your primary 1-page resume from scratch or upload an existing one to improve. May will use best practices to craft a compelling professional resume.
          </p>
        </div>

        <div className="action-card stagger-2" onClick={() => onNavigate('tailor')}>
          <span className="action-card-icon">
            <TargetIcon />
          </span>
          <h2 className="action-card-title">Tailor for Jobs</h2>
          <p className="action-card-description">
            Customize your resume for specific roles. Paste one job description or multiple at once—May will create tailored versions for each.
          </p>
        </div>
      </div>

      {/* Resume Bank Access Button */}
      <div style={{
        marginTop: 'var(--space-3xl)',
        paddingTop: 'var(--space-xl)',
        borderTop: '1px solid var(--border-subtle)',
        textAlign: 'center',
        maxWidth: '900px',
        margin: 'var(--space-3xl) auto 0'
      }}>
        <button
          onClick={() => setShowPasswordPrompt(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-tertiary)',
            fontSize: '13px',
            cursor: 'pointer',
            padding: 'var(--space-sm)',
            opacity: 0.5,
            transition: 'opacity 0.2s ease'
          }}
          onMouseEnter={(e) => e.target.style.opacity = '1'}
          onMouseLeave={(e) => e.target.style.opacity = '0.5'}
        >
          Resume Bank
        </button>
      </div>

      {/* Password Prompt Modal */}
      {showPasswordPrompt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => {
          setShowPasswordPrompt(false)
          setPassword('')
          setPasswordError(false)
        }}>
          <div style={{
            background: 'white',
            borderRadius: '24px',
            padding: 'var(--space-2xl)',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '20px', marginBottom: 'var(--space-md)' }}>
              Resume Bank Access
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: 'var(--space-lg)' }}>
              Enter password to access the resume bank upload system.
            </p>
            <form onSubmit={handlePasswordSubmit}>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setPasswordError(false)
                }}
                placeholder="Enter password"
                autoFocus
                style={{
                  width: '100%',
                  padding: 'var(--space-md)',
                  border: `2px solid ${passwordError ? '#ef4444' : 'var(--border-subtle)'}`,
                  borderRadius: '12px',
                  fontSize: '16px',
                  marginBottom: 'var(--space-md)',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
              />
              {passwordError && (
                <p style={{ color: '#ef4444', fontSize: '14px', marginBottom: 'var(--space-md)' }}>
                  Incorrect password
                </p>
              )}
              <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowPasswordPrompt(false)
                    setPassword('')
                    setPasswordError(false)
                  }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Menu Modal */}
      {showAdminMenu && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowAdminMenu(false)}>
          <div style={{
            background: 'white',
            borderRadius: '24px',
            padding: 'var(--space-2xl)',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '20px', marginBottom: 'var(--space-lg)' }}>
              Admin Tools
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <button
                className="btn btn-primary"
                onClick={() => handleAdminAction('resumebank')}
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                📤 Upload Resumes to Bank
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleAdminAction('patterns')}
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                🔍 Extract Patterns
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowAdminMenu(false)}
                style={{ width: '100%', marginTop: 'var(--space-md)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Home
