import { useState, useEffect } from 'react'
import './App.css'
import Home from './components/Home'
import Stage1Chatbot from './components/Stage1Chatbot'
import ResumeUpload from './components/ResumeUpload'
import Stage2Tailor from './components/Stage2Tailor'
import LinkedInImport from './components/LinkedInImport'

function App() {
  // Hardcoded API key
  const apiKey = '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'

  const [page, setPage] = useState('home') // 'home', 'linkedin-import', 'build', 'update', 'tailor'
  const [masterResume, setMasterResume] = useState(null)
  const [linkedInData, setLinkedInData] = useState(null)

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
    if (destination === 'build') {
      // Go to LinkedIn import first
      setPage('linkedin-import')
    } else {
      setPage(destination)
    }
  }

  const handleLinkedInImport = (data) => {
    setLinkedInData(data)
    setPage('build')
  }

  const handleSkipLinkedIn = () => {
    setLinkedInData(null)
    setPage('build')
  }

  const handleResumeComplete = (resumeData) => {
    setMasterResume(resumeData)
    setLinkedInData(null) // Clear LinkedIn data after resume is built
    setPage('home')
  }

  const handleBack = () => {
    setLinkedInData(null)
    setPage('home')
  }

  return (
    <div className="app">
      {page === 'home' && (
        <Home onNavigate={handleNavigate} />
      )}

      {page === 'linkedin-import' && (
        <LinkedInImport
          onImportComplete={handleLinkedInImport}
          onSkip={handleSkipLinkedIn}
        />
      )}

      {page === 'build' && (
        <Stage1Chatbot
          apiKey={apiKey}
          onResumeComplete={handleResumeComplete}
          onBack={handleBack}
          existingResume={masterResume}
          linkedInData={linkedInData}
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
    </div>
  )
}

export default App
