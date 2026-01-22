import { useState } from 'react'
import '../App.css'
import { WritingIcon, TargetIcon, SearchIcon } from '../utils/icons'
import { useAuth } from '../contexts/AuthContext'
import AuthModal from './auth/AuthModal'

function Home({ onNavigate, user, hasPrimaryResume }) {
  const { signOut } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      setShowUserMenu(false)
    } catch (error) {
      console.error('Error signing out:', error)
    }
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
        <p className="tagline">Your AI-powered resume builder</p>
        
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

        <div className="action-card stagger-3" onClick={() => onNavigate('review')}>
          <span className="action-card-icon">
            <SearchIcon />
          </span>
          <h2 className="action-card-title">Get Feedback</h2>
          <p className="action-card-description">
            Get expert AI analysis of your resume quality. May will score each section and provide specific, actionable suggestions for improvement.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Home
