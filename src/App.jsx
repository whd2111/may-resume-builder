import { useState } from 'react'
import './App.css'
import { useAuth } from './contexts/AuthContext'
import { useResumes } from './hooks/useResumes'
import Home from './components/Home'
import BuildResume from './components/BuildResume'
import TailorJobs from './components/TailorJobs'
import ResumeReviewer from './components/ResumeReviewer'
import ResumeLibrary from './components/ResumeLibrary'
import Dashboard from './components/Dashboard'
import ResumeBankUpload from './components/ResumeBankUpload'
import PatternExtractor from './components/PatternExtractor'

function App() {
  const { user, loading: authLoading } = useAuth()
  const { masterResume: primaryResume, createResume, updateResume, setAsMaster: setAsPrimary, loading: resumesLoading } = useResumes()
  const [page, setPage] = useState('home') // 'home', 'build', 'tailor', 'review', 'library', 'dashboard', 'resumebank', 'patterns'

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="app">
        <div className="container" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="loading" />
          <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading May...</p>
        </div>
      </div>
    )
  }

  const handleNavigate = (destination) => {
    setPage(destination)
  }

  const handleResumeComplete = async (resumeData, title = 'Master Resume', isMaster = true) => {
    if (!user) return

    try {
      // If there's already a primary resume, update it; otherwise create new
      if (isMaster && primaryResume) {
        await updateResume(primaryResume.id, {
          resume_data: resumeData,
          title: title,
        })
      } else {
        await createResume(title, resumeData, isMaster)
      }
      setPage('home')
    } catch (error) {
      console.error('Error saving resume:', error)
      alert('Failed to save resume. Please try again.')
    }
  }

  const handleBack = () => {
    setPage('home')
  }

  return (
    <div className="app">
      {page === 'home' && (
        <Home 
          onNavigate={handleNavigate}
          user={user}
          hasPrimaryResume={!!primaryResume}
        />
      )}

      {page === 'build' && (
        <BuildResume
          onResumeComplete={handleResumeComplete}
          onBack={handleBack}
          existingResume={primaryResume?.resume_data}
          user={user}
        />
      )}

      {page === 'tailor' && (
        <TailorJobs
          primaryResume={primaryResume?.resume_data}
          onBack={handleBack}
          onNavigate={handleNavigate}
          user={user}
        />
      )}

      {page === 'review' && (
        <ResumeReviewer
          primaryResume={primaryResume?.resume_data}
          onBack={handleBack}
          onNavigate={handleNavigate}
          user={user}
        />
      )}

      {page === 'library' && (
        <ResumeLibrary
          onBack={handleBack}
        />
      )}

      {page === 'dashboard' && (
        <Dashboard
          onBack={handleBack}
        />
      )}

      {page === 'resumebank' && (
        <ResumeBankUpload
          onBack={handleBack}
        />
      )}

      {page === 'patterns' && (
        <PatternExtractor
          onBack={handleBack}
        />
      )}
    </div>
  )
}

export default App
