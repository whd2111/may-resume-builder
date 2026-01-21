import { useState, useEffect } from 'react'
import './App.css'
import Home from './components/Home'
import Stage1Chatbot from './components/Stage1Chatbot'
import ResumeUpload from './components/ResumeUpload'
import Stage2Tailor from './components/Stage2Tailor'
import ResumeReviewer from './components/ResumeReviewer'
import BatchTailor from './components/BatchTailor'

function App() {
  // Hardcoded API key
  const apiKey = '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'

  const [page, setPage] = useState('home') // 'home', 'build', 'update', 'tailor', 'review', 'batch'
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
        <Stage1Chatbot
          apiKey={apiKey}
          onResumeComplete={handleResumeComplete}
          onBack={handleBack}
          existingResume={masterResume}
        />
      )}

      {page === 'update' && (
        <ResumeUpload
          apiKey={apiKey}
          onBack={handleBack}
        />
      )}

      {page === 'tailor' && (
        <Stage2Tailor
          apiKey={apiKey}
          masterResume={masterResume}
          onBack={handleBack}
        />
      )}

      {page === 'review' && (
        <ResumeReviewer
          apiKey={apiKey}
          masterResume={masterResume}
          onBack={handleBack}
        />
      )}

      {page === 'batch' && (
        <BatchTailor
          apiKey={apiKey}
          masterResume={masterResume}
          onBack={handleBack}
        />
      )}
    </div>
  )
}

export default App
