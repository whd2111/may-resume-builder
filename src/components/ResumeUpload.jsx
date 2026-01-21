import { useState } from 'react'
import { callClaude } from '../utils/claudeApi'
import { generateDOCX } from '../utils/docxGenerator'
import mammoth from 'mammoth'

const REWRITE_PROMPT = `You are May, an expert resume rewriter. You've been given a resume to improve using professional best practices.

REWRITING RULES:
1. Use strong action verbs (led, built, drove, managed, designed, created, launched, etc.)
2. Apply the "did X by Y as shown by Z" framework wherever possible
3. Keep bullets concise - MAX 2 lines each
4. Add metrics and quantify impact (use existing numbers or suggest [ADD METRIC] where they should add one)
5. Focus on individual contributions and impact
6. Remove weak language like "helped with", "responsible for", "assisted in"
7. Make every bullet start with a strong action verb
8. Ensure proper formatting and consistency

IMPORTANT:
- Maintain all factual information - do NOT fabricate experience
- Keep the same structure (sections, order, dates, etc.)
- Improve wording while staying truthful
- If metrics are missing, keep the accomplishment but note where metrics would help

Respond with a JSON object in this EXACT format:
{
  "action": "rewritten_resume",
  "data": {
    "name": "Full Name",
    "contact": {
      "phone": "123-456-7890",
      "email": "email@example.com",
      "linkedin": "linkedin.com/in/username" (optional)
    },
    "education": [
      {
        "institution": "University Name",
        "degree": "Degree Name",
        "location": "City, ST",
        "dates": "YYYY - YYYY",
        "details": "Honors, GPA, etc." (optional)
      }
    ],
    "experience": [
      {
        "company": "Company Name",
        "title": "Job Title",
        "location": "City, ST",
        "dates": "YYYY - YYYY",
        "bullets": [
          "Improved bullet with action verb + impact + metrics",
          "Another rewritten bullet following best practices"
        ]
      }
    ],
    "skills": "Skills listed" (optional),
    "additional": "Any other sections" (optional)
  },
  "improvements": "Brief summary of the main improvements made"
}`;

function ResumeUpload({ apiKey, onBack }) {
  const [file, setFile] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [rewrittenResume, setRewrittenResume] = useState(null)
  const [improvements, setImprovements] = useState('')
  const [error, setError] = useState('')

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.name.endsWith('.docx')) {
        setFile(selectedFile)
        setError('')
      } else {
        setError('Please upload a .docx file')
      }
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      if (droppedFile.name.endsWith('.docx')) {
        setFile(droppedFile)
        setError('')
      } else {
        setError('Please upload a .docx file')
      }
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const parseDocx = async (file) => {
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value
  }

  const handleRewrite = async () => {
    if (!file) return

    setIsProcessing(true)
    setError('')

    try {
      // Parse DOCX file
      const resumeText = await parseDocx(file)

      // Send to Claude for rewriting
      const prompt = `Here is the resume to rewrite:\n\n${resumeText}\n\nPlease rewrite this resume following best practices.`
      const response = await callClaude(apiKey, [{ role: 'user', content: prompt }], REWRITE_PROMPT)

      // Parse response
      const jsonMatch = response.match(/\{[\s\S]*"action":\s*"rewritten_resume"[\s\S]*\}/)
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0])
        setRewrittenResume(result.data)
        setImprovements(result.improvements || 'Resume rewritten successfully!')
      } else {
        throw new Error('Could not parse rewritten resume')
      }
    } catch (err) {
      setError(`Error: ${err.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownload = async () => {
    try {
      await generateDOCX(rewrittenResume, 'rewritten_resume.docx')
    } catch (err) {
      setError(`Error generating document: ${err.message}`)
    }
  }

  const handleStartOver = () => {
    setFile(null)
    setRewrittenResume(null)
    setImprovements('')
    setError('')
  }

  return (
    <div className="container">
      <div className="page-header">
        <button className="back-button" onClick={onBack}>
          ← Back to Home
        </button>
        <h1 className="page-title">Update Your Main Resume</h1>
        <p className="page-subtitle">
          Upload your existing resume and May will rewrite it using professional best practices
        </p>
      </div>

      {!rewrittenResume ? (
        <>
          {!file ? (
            <div
              className="upload-area"
              onClick={() => document.getElementById('file-input').click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <div className="upload-icon">📄</div>
              <h3 className="upload-title">Upload your resume</h3>
              <p className="upload-subtitle">
                Click to browse or drag and drop your .docx file here
              </p>
              <input
                id="file-input"
                type="file"
                accept=".docx"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>
          ) : (
            <div className="card">
              <div className="card-title">Selected File</div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
                {file.name}
              </p>
              <div className="button-group">
                <button className="btn btn-secondary" onClick={handleStartOver}>
                  Choose Different File
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleRewrite}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <span className="loading-spinner"></span> Rewriting...
                    </>
                  ) : (
                    'Rewrite Resume'
                  )}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="info-box" style={{ borderColor: '#ff6b6b', background: '#ffe0e0' }}>
              <div className="info-box-text" style={{ color: '#c92a2a' }}>
                {error}
              </div>
            </div>
          )}

          <div className="info-box">
            <div className="info-box-title">What May will do:</div>
            <div className="info-box-text">
              • Rewrite bullets with strong action verbs and "did X by Y as shown by Z" framework
              <br />
              • Add or improve metrics to quantify your impact
              <br />
              • Remove weak language and improve conciseness
              <br />
              • Maintain all factual information (no fabrication)
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="success-banner">
            <span className="success-icon">✓</span>
            <div className="success-text">
              Resume rewritten successfully! {improvements}
            </div>
          </div>

          <div className="card">
            <div className="card-title">Preview</div>
            <div style={{
              padding: 'var(--space-xl)',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              maxHeight: '400px',
              overflow: 'auto',
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              <h3>{rewrittenResume.name}</h3>
              <p>{rewrittenResume.contact.email} | {rewrittenResume.contact.phone}</p>
              <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--border-default)' }} />

              {rewrittenResume.experience?.map((exp, idx) => (
                <div key={idx} style={{ marginBottom: '16px' }}>
                  <strong>{exp.title}</strong> - {exp.company}
                  <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                    {exp.bullets?.map((bullet, bidx) => (
                      <li key={bidx}>{bullet}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="button-group">
            <button className="btn btn-secondary" onClick={handleStartOver}>
              Upload Another Resume
            </button>
            <button className="btn btn-primary" onClick={handleDownload}>
              Download Rewritten Resume
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default ResumeUpload
