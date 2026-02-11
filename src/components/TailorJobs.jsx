import { useState } from 'react'
import Stage2Tailor from './Stage2Tailor'
import BatchTailor from './BatchTailor'
import { ArrowLeftIcon, TargetIcon, WritingIcon, DownloadIcon } from '../utils/icons'
import mammoth from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist'

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

function TailorJobs({ primaryResume, onBack, onNavigate }) {
  const [mode, setMode] = useState(null) // null, 'single', 'batch'
  const [uploadedResume, setUploadedResume] = useState(null) // Resume parsed from upload
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  // Parse DOCX file
  const parseDocx = async (file) => {
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value
  }

  // Parse PDF file
  const parsePdf = async (file) => {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let fullText = ''
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map(item => item.str).join(' ')
      fullText += pageText + '\n'
    }
    
    return fullText
  }

  // Handle file upload and parse resume
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadError('')

    try {
      // Parse resume file
      let resumeText
      if (file.name.endsWith('.pdf')) {
        resumeText = await parsePdf(file)
      } else if (file.name.endsWith('.docx')) {
        resumeText = await parseDocx(file)
      } else {
        throw new Error('Please upload a .docx or .pdf file')
      }

      // Simple parsing: extract name, contact, experience, education from text
      // This creates a basic resume object for tailoring
      const resumeData = parseResumeText(resumeText)
      setUploadedResume(resumeData)
    } catch (err) {
      console.error('Error parsing resume:', err)
      setUploadError(err.message || 'Failed to parse resume. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  // Enhanced text parsing to extract resume structure
  const parseResumeText = (text) => {
    const lines = text.split('\n').filter(line => line.trim())
    
    // Extract name (usually first line)
    const name = lines[0]?.trim() || 'Your Name'
    
    // Extract contact info
    const emailMatch = text.match(/[\w\.-]+@[\w\.-]+\.\w+/)
    const phoneMatch = text.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)
    const linkedinMatch = text.match(/linkedin\.com\/in\/[\w-]+/)
    
    // Find section headers
    const experienceIdx = lines.findIndex(line => 
      /^(experience|work experience|professional experience|employment)/i.test(line.trim())
    )
    const educationIdx = lines.findIndex(line => 
      /^(education|academic)/i.test(line.trim())
    )
    const skillsIdx = lines.findIndex(line => 
      /^(skills|technical skills|core competencies)/i.test(line.trim())
    )
    
    // Extract experience bullets (lines starting with bullet points or dashes)
    const experienceBullets = []
    let currentCompany = 'Previous Experience'
    let currentTitle = 'Various Roles'
    let currentDates = ''
    
    if (experienceIdx >= 0) {
      const endIdx = educationIdx >= 0 ? educationIdx : (skillsIdx >= 0 ? skillsIdx : lines.length)
      const experienceLines = lines.slice(experienceIdx + 1, endIdx)
      
      experienceLines.forEach(line => {
        const trimmed = line.trim()
        // Detect company/title lines (usually BOLD or longer lines without bullets)
        if (trimmed.length > 20 && !trimmed.match(/^[•\-\*]/)) {
          // Could be company name or title
          if (trimmed.match(/\d{4}/)) {
            // Has year, likely contains dates
            const dateMatch = trimmed.match(/(\w+\s+\d{4}\s*[-–]\s*\w+\s+\d{4}|\d{4}\s*[-–]\s*\d{4}|present)/i)
            if (dateMatch) currentDates = dateMatch[0]
            currentCompany = trimmed.replace(/\d{4}.*/g, '').trim()
          }
        }
        // Detect bullet points
        else if (trimmed.match(/^[•\-\*◦▪]/)) {
          const bulletText = trimmed.replace(/^[•\-\*◦▪]\s*/, '').trim()
          if (bulletText.length > 10) { // Filter out very short bullets
            experienceBullets.push(bulletText)
          }
        }
      })
    }
    
    // If no bullets found, create generic ones
    if (experienceBullets.length === 0) {
      experienceBullets.push('Professional experience available for tailoring')
    }
    
    // Extract skills
    let skills = ''
    if (skillsIdx >= 0) {
      const endIdx = lines.length
      const skillsLines = lines.slice(skillsIdx + 1, endIdx)
      skills = skillsLines.join(' ')
    }
    
    return {
      name,
      contact: {
        email: emailMatch ? emailMatch[0] : '',
        phone: phoneMatch ? phoneMatch[0] : '',
        linkedin: linkedinMatch ? `https://${linkedinMatch[0]}` : '',
      },
      experience: [{
        company: currentCompany,
        title: currentTitle,
        dates: currentDates,
        location: '',
        bullets: experienceBullets
      }],
      education: [],
      skills: skills.substring(0, 200), // Limit skills length
      _rawText: text // Store raw text for AI reference
    }
  }

  const activeResume = uploadedResume || primaryResume

  if (mode === 'single') {
    return (
      <Stage2Tailor
        primaryResume={activeResume}
        onBack={() => {
          setMode(null)
          setUploadedResume(null)
        }}
        onNavigate={onNavigate}
      />
    )
  }

  if (mode === 'batch') {
    return (
      <BatchTailor
        primaryResume={activeResume}
        onBack={() => {
          setMode(null)
          setUploadedResume(null)
        }}
        onNavigate={onNavigate}
      />
    )
  }

  if (!primaryResume && !uploadedResume) {
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
          <p className="page-subtitle">First, upload your resume or build one with May</p>
        </div>

        <div className="action-cards" style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Upload Resume Option */}
          <div 
            className="action-card stagger-1" 
            onClick={() => document.getElementById('resume-upload-input').click()}
            style={{ cursor: isUploading ? 'wait' : 'pointer', opacity: isUploading ? 0.6 : 1 }}
          >
            <span className="action-card-icon">
              <DownloadIcon />
            </span>
            <h2 className="action-card-title">
              {isUploading ? 'Uploading...' : 'Upload Your Resume'}
            </h2>
            <p className="action-card-description">
              Have an existing resume? Upload it here (.docx or .pdf) and May will tailor it for your target jobs.
            </p>
            {uploadError && (
              <p style={{ color: '#ef4444', fontSize: '14px', marginTop: 'var(--space-sm)' }}>
                {uploadError}
              </p>
            )}
            <input
              id="resume-upload-input"
              type="file"
              accept=".docx,.pdf"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              disabled={isUploading}
            />
          </div>

          {/* Build with May Option */}
          <div className="action-card stagger-2" onClick={() => onNavigate('build')}>
            <span className="action-card-icon">
              <WritingIcon />
            </span>
            <h2 className="action-card-title">Build with May</h2>
            <p className="action-card-description">
              Don't have a resume yet? Upload one and May will rewrite it using best practices before tailoring.
            </p>
          </div>
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
        {uploadedResume && (
          <div style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: 'var(--space-md)',
            marginTop: 'var(--space-md)',
            fontSize: '14px',
            color: 'var(--text-secondary)'
          }}>
            ✓ Using uploaded resume: <strong>{uploadedResume.name}</strong>
          </div>
        )}
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
