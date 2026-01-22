import { useState } from 'react'
import './App.css'
import { useAuth } from './contexts/AuthContext'
import { useResumes } from './hooks/useResumes'
import Home from './components/Home'
import BuildResume from './components/BuildResume'
import TailorJobs from './components/TailorJobs'
import ResumeReviewer from './components/ResumeReviewer'
import ResumeLibrary from './components/ResumeLibrary'

function App() {
  const { user, loading: authLoading } = useAuth()
  const { masterResume, createResume, updateResume, setAsMaster, loading: resumesLoading } = useResumes()
  const [page, setPage] = useState('home') // 'home', 'build', 'tailor', 'review', 'library'

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
      // If there's already a master resume, update it; otherwise create new
      if (isMaster && masterResume) {
        await updateResume(masterResume.id, {
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
          hasMasterResume={!!masterResume}
        />
      )}

      {page === 'build' && (
        <BuildResume
          onResumeComplete={handleResumeComplete}
          onBack={handleBack}
          existingResume={masterResume?.resume_data}
          user={user}
        />
      )}

      {page === 'tailor' && (
        <TailorJobs
          masterResume={masterResume?.resume_data}
          onBack={handleBack}
          user={user}
        />
      )}

      {page === 'review' && (
        <ResumeReviewer
          masterResume={masterResume?.resume_data}
          onBack={handleBack}
          user={user}
        />
      )}

      {page === 'library' && (
        <ResumeLibrary
          onBack={handleBack}
        />
      )}
    </div>
  )
}

export default App
