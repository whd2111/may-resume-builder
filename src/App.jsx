import { useState, useEffect } from 'react'
import './App.css'
import Home from './components/Home'
import BuildResume from './components/BuildResume'
import TailorJobs from './components/TailorJobs'
import ResumeReviewer from './components/ResumeReviewer'

function App() {
  // API key is now handled server-side via Vercel serverless function
  // No need to pass it from client anymore
  const [page, setPage] = useState('home') // 'home', 'build', 'tailor', 'review'
  const [masterResume, setMasterResume] = useState(null)

  // Load saved resume from localStorage
  useEffect(() => {
    const savedResume = localStorage.getItem('may_master_resume')
    if (savedResume) {
      setMasterResume(JSON.parse(savedResume))
    }
  }, [])

  // Save resume to localStorage when it changes
  useEffect(() => {
    if (masterResume) {
      localStorage.setItem('may_master_resume', JSON.stringify(masterResume))
    }
  }, [masterResume])

  const handleNavigate = (destination) => {
    setPage(destination)
  }

  const handleResumeComplete = (resumeData) => {
    setMasterResume(resumeData)
    setPage('home')
  }

  const handleBack = () => {
    setPage('home')
  }

  return (
    <div className="app">
      {page === 'home' && (
        <Home onNavigate={handleNavigate} />
      )}

      {page === 'build' && (
        <BuildResume
          onResumeComplete={handleResumeComplete}
          onBack={handleBack}
          existingResume={masterResume}
        />
      )}

      {page === 'tailor' && (
        <TailorJobs
          masterResume={masterResume}
          onBack={handleBack}
        />
      )}

      {page === 'review' && (
        <ResumeReviewer
          masterResume={masterResume}
          onBack={handleBack}
        />
      )}
    </div>
  )
}

export default App
