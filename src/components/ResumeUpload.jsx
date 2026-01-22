import { useState } from 'react'
import { callClaude } from '../utils/claudeApi'
import { generateDOCX } from '../utils/docxGenerator'
import mammoth from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist'
import MetricPrompter from './MetricPrompter'
import { ArrowLeftIcon, DownloadIcon, WritingIcon } from '../utils/icons'

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

// ... existing prompts ...

const REWRITE_PROMPT = `You are May, an expert resume rewriter following Columbia Business School Resume Standards. You improve resumes using proven best practices.

CBS RESUME STANDARDS:
1. MUST stay on one page - be concise
2. DO NOT re-order sections or add new sections
3. Use Times New Roman, 10-12pt font (output as 10pt by default)
4. Margins: 0.5 to 0.75 inches

BULLET POINT RULES:
- Two to six bullets per job title
- One to two lines per bullet; three lines should be avoided if possible
- Start with strong action verb in PAST TENSE unless current role
- Vary choice of verbs - don't repeat the same verb
- Lead with most impressive and applicable experiences
- List external-facing roles first, then internal activities
- DO NOT use "responsibilities include..."
- Show results, quantify with numbers and percentages
- If cannot quantify, describe in qualitative terms (e.g., "improved customer service")
- Talk about YOUR personal accomplishments - do NOT write "part of a team that..." or "Member of team..."
- DO NOT use bullets to describe employers

ACTION VERBS (vary these):
Leading: Led, Managed, Directed, Spearheaded, Drove, Oversaw
Getting Results: Achieved, Delivered, Increased, Reduced, Improved, Built, Generated
Problem Solving: Analyzed, Solved, Designed, Engineered, Developed, Created
Organizing: Coordinated, Implemented, Established, Streamlined, Optimized

EDUCATION SECTION:
- List in reverse chronological order
- Include honors, leadership roles, memberships
- For leadership: only list if not already on Member line
- Latin honors in lowercase and italicized: summa cum laude, magna cum laude, cum laude

FORMATTING:
- US cities: "City, State" (not "City, Country" for US locations)
- Use action verbs in past tense: "Managed" not "Management of"
- Show career progression - include all positions at same company

IMPORTANT:
- Maintain all factual information - do NOT fabricate experience
- Keep the same structure and section order
- Improve wording while staying truthful
- If metrics are missing, suggest [ADD METRIC] where appropriate

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
      if (selectedFile.name.endsWith('.docx') || selectedFile.name.endsWith('.pdf')) {
        setFile(selectedFile)
        setError('')
      } else {
        setError('Please upload a .docx or .pdf file')
      }
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      if (droppedFile.name.endsWith('.docx') || droppedFile.name.endsWith('.pdf')) {
        setFile(droppedFile)
        setError('')
      } else {
        setError('Please upload a .docx or .pdf file')
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

  const parsePdf = async (file) => {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let text = ''
    
    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items.map(item => item.str).join(' ')
      text += pageText + '\n'
    }
    
    return text
  }

  const handleRewrite = async () => {
    if (!file) return

    setIsProcessing(true)
    setError('')

    try {
      // Parse file based on type
      let resumeText
      if (file.name.endsWith('.pdf')) {
        resumeText = await parsePdf(file)
      } else {
        resumeText = await parseDocx(file)
      }

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
      // Generate filename from user's name: LASTNAME_FIRSTNAME_RESUME.docx
      await generateDOCX(rewrittenResume, null, null) // null params let docxGenerator auto-generate filename
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
      <nav className="nav-bar">
        {onBack && (
          <button className="back-button" onClick={onBack}>
            <ArrowLeftIcon />
            Back
          </button>
        )}
        <div className="logo" style={{ fontSize: '24px', margin: 0 }}>May</div>
      </nav>

      <div className="page-header">
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
                Click to browse or drag and drop your .docx or .pdf file here
              </p>
              <p className="action-card-description" style={{ textAlign: 'center', fontSize: '13px', marginTop: '8px', color: 'var(--text-secondary)' }}>
                💡 Tip: .docx files work best for accurate formatting
              </p>
              <input
                id="file-input"
                type="file"
                accept=".docx,.pdf"
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
                      <WritingIcon />
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
              <WritingIcon />
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
              <WritingIcon />
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
