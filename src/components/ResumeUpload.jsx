import { useState } from 'react'
import { callClaude } from '../utils/claudeApi'
import { generateDOCX } from '../utils/docxGenerator'
import mammoth from 'mammoth'
import MetricPrompter from './MetricPrompter'
import { ArrowLeftIcon, DownloadIcon, SparklesIcon } from '../utils/icons'

// ... existing prompts ...

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

function ResumeUpload({ onResumeComplete, onBack }) {
  const [file, setFile] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [rewrittenResume, setRewrittenResume] = useState(null)
  const [showMetricPrompter, setShowMetricPrompter] = useState(false)
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
      const response = await callClaude(null, [{ role: 'user', content: prompt }], REWRITE_PROMPT)

      // Parse response
      const jsonMatch = response.match(/\{[\s\S]*"action":\s*"rewritten_resume"[\s\S]*\}/)
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0])
        setRewrittenResume(result.data)
        setImprovements(result.improvements || 'Resume rewritten successfully!')

        // Check if resume has [ADD METRIC] placeholders
        const hasMetrics = JSON.stringify(result.data).includes('[ADD METRIC]')
        if (hasMetrics) {
          setShowMetricPrompter(true)
        }
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

  const handleSaveAsPrimary = () => {
    // Save the rewritten resume as the primary resume
    onResumeComplete(rewrittenResume)
  }

  const handleMetricsComplete = async (updatedResumeData) => {
    // Update the rewritten resume with filled-in metrics
    setRewrittenResume(updatedResumeData)
    setShowMetricPrompter(false)

    // Regenerate DOCX with the updated metrics
    await generateDOCX(updatedResumeData)
  }

  const handleSkipMetrics = () => {
    setShowMetricPrompter(false)
  }

  const handleStartOver = () => {
    setFile(null)
    setRewrittenResume(null)
    setShowMetricPrompter(false)
    setImprovements('')
    setError('')
  }

  // Show metric prompter if resume has [ADD METRIC] placeholders
  if (showMetricPrompter && rewrittenResume) {
    return (
      <MetricPrompter
        resumeData={rewrittenResume}
        onComplete={handleMetricsComplete}
        onSkip={handleSkipMetrics}
      />
    )
  }

  return (
    <div className="container">
      <div className="page-header">
        {onBack && (
          <button className="back-button" onClick={onBack}>
            <ArrowLeftIcon />
            Back to Home
          </button>
        )}
        <h1 className="page-title">Update Your Resume</h1>
        <p className="page-subtitle">
          Upload your existing resume and May will rewrite it using professional best practices
        </p>
      </div>

      {!rewrittenResume ? (
        <>
          {!file ? (
            <div
              className="upload-area stagger-1"
              onClick={() => document.getElementById('file-input').click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <div className="action-card-icon" style={{ margin: '0 auto var(--space-xl)', background: 'var(--gradient-warm)' }}>
                <DownloadIcon />
              </div>
              <h3 className="action-card-title" style={{ textAlign: 'center' }}>Upload your resume</h3>
              <p className="action-card-description" style={{ textAlign: 'center' }}>
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
            <div className="card-premium stagger-1">
              <div className="card-title">
                <DownloadIcon />
                Selected File
              </div>
              <p style={{ color: 'var(--text-primary)', fontWeight: '600', marginBottom: 'var(--space-xl)', fontSize: '18px' }}>
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
                    <div className="loading"></div>
                  ) : (
                    <>
                      <SparklesIcon />
                      Rewrite Resume
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="card-premium" style={{ borderLeft: '4px solid #ef4444', background: '#fef2f2' }}>
              <p style={{ color: '#b91c1c' }}>{error}</p>
            </div>
          )}

          <div className="card-premium stagger-2">
            <div className="card-title">
              <SparklesIcon />
              What May will do:
            </div>
            <div className="info-box-text" style={{ fontSize: '15px', lineHeight: '1.8' }}>
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
        <div className="stagger-1">
          <div className="card-premium" style={{ borderLeft: '4px solid #10b981', background: '#f0fdf4' }}>
            <div className="card-title" style={{ color: '#065f46' }}>
              <SparklesIcon />
              Resume Rewritten!
            </div>
            <p style={{ color: '#065f46', fontSize: '15px' }}>{improvements}</p>
          </div>

          <div className="card-premium" style={{ background: 'white' }}>
            <div className="card-title">Preview</div>
            <div style={{
              padding: 'var(--space-lg)',
              maxHeight: '400px',
              overflow: 'auto',
              fontSize: '14px',
              lineHeight: '1.6',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px'
            }}>
              <h3 style={{ fontSize: '20px', fontWeight: '800' }}>{rewrittenResume.name}</h3>
              <p style={{ color: 'var(--text-secondary)' }}>{rewrittenResume.contact.email} | {rewrittenResume.contact.phone}</p>
              <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--border-subtle)' }} />

              {rewrittenResume.experience?.map((exp, idx) => (
                <div key={idx} style={{ marginBottom: '16px' }}>
                  <strong>{exp.title}</strong> — {exp.company}
                  <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                    {exp.bullets?.map((bullet, bidx) => (
                      <li key={bidx} style={{ marginBottom: '4px' }}>{bullet}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="button-group" style={{ marginTop: 'var(--space-xl)' }}>
            <button className="btn btn-secondary" onClick={handleStartOver}>
              Upload Another
            </button>
            <button className="btn btn-secondary" onClick={handleDownload}>
              <DownloadIcon />
              Download DOCX
            </button>
            <button className="btn btn-primary" onClick={handleSaveAsPrimary}>
              Save as Primary Resume
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ResumeUpload
