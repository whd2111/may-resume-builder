import { useState, useEffect } from 'react'
import { callClaude } from '../utils/claudeApi'
import { generateDOCX, measurePageFill } from '../utils/docxGenerator'
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
2. NO SUMMARY OR OBJECTIVE SECTION - CBS resumes do NOT include summary/objective statements
3. Standard section order: Education, Experience, Additional (skills, activities, interests)
4. Use Times New Roman, 10-12pt font (output as 10pt by default)
5. Margins: 0.5 to 0.75 inches

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
- Keep experience in reverse chronological order (most recent first)
- Improve wording while staying truthful
- If metrics are missing, suggest [ADD METRIC] where appropriate

HANDLING MISSING INFORMATION:
- If a field (phone, email, linkedin, location, etc.) is NOT present in the source resume, return null or an empty string for that field
- Do NOT insert placeholders like "[ADD PHONE NUMBER]", "[ADD EMAIL]", "[YOUR CITY]", etc.
- Only include information that is explicitly provided in the original resume

Respond with a JSON object in this EXACT format:
{
  "action": "rewritten_resume",
  "data": {
    "name": "Full Name",
    "contact": {
      "phone": "123-456-7890 or null if not provided",
      "email": "email@example.com or null if not provided",
      "linkedin": "linkedin.com/in/username or null if not provided"
    },
    "education": [
      {
        "institution": "University Name",
        "degree": "Degree Name",
        "location": "City, ST",
        "dates": "YYYY - YYYY",
        "gpa": "3.74/4.0 or null if not present - EXTRACT GPA HERE if mentioned anywhere in education",
        "details": "Honors, activities, relevant coursework, etc. (excluding GPA which goes in gpa field) or null"
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
    "skills": "Skills listed or null",
    "additional": "Any other standard sections (activities, interests, languages) or null",
    "custom_sections": [
      {
        "title": "Section Title (e.g., Awards, Certifications, Publications)",
        "content": ["Item 1", "Item 2", "Item 3"]
      }
    ]
  },
  "improvements": "Brief summary of the main improvements made"
}

IMPORTANT GPA EXTRACTION:
- If a GPA is present anywhere in the education section (e.g., "GPA: 3.7", "3.7/4.0", "GPA 3.74"), extract it to the "gpa" field
- Do NOT leave GPA buried in the "details" field - it should be in its own "gpa" field
- Format GPA as "X.XX" or "X.XX/4.0" (include scale if available)
- If no GPA is mentioned, set "gpa" to null

NOTE: The "custom_sections" array captures any non-standard sections like Awards, Certifications, Publications, Languages, etc. If no such sections exist, return an empty array [].`;

// Prompt for trimming overflow content
const TRIM_PROMPT = `You are May, an expert resume editor. The user's resume is currently OVER 1 PAGE and needs to be trimmed.

YOUR TASK: Trim the resume to fit on exactly 1 page by removing approximately {LINES_OVER} lines worth of content.

TRIMMING RULES (in priority order):
1. FIRST: Shorten verbose bullets - tighten language, remove filler words
2. SECOND: Remove the LEAST impactful bullets from roles with 5+ bullets (keep min 2-3 per role)
3. THIRD: Combine similar bullets if possible
4. FOURTH: Trim older/less relevant experience more aggressively than recent experience
5. NEVER remove entire jobs or education entries
6. NEVER fabricate or change factual information
7. Preserve the most impressive metrics and achievements

ESTIMATE: Each bullet point is roughly 1-2 lines. To remove {LINES_OVER} lines, you may need to:
- Remove {BULLETS_TO_REMOVE} bullet points, OR
- Significantly shorten {BULLETS_TO_SHORTEN} bullets

Return the trimmed resume in the EXACT same JSON format as the input, with an "improvements" field describing what was trimmed.`;

function ResumeUpload({ onResumeComplete, onBack }) {
  const [file, setFile] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [rewrittenResume, setRewrittenResume] = useState(null)
  const [showContactPrompter, setShowContactPrompter] = useState(false)
  const [showMetricPrompter, setShowMetricPrompter] = useState(false)
  const [improvements, setImprovements] = useState('')
  const [error, setError] = useState('')
  const [contactForm, setContactForm] = useState({ phone: '', email: '', linkedin: '' })
  const [pageFill, setPageFill] = useState(null)
  const [showTrimModal, setShowTrimModal] = useState(false)
  const [linesOver, setLinesOver] = useState('')
  const [isTrimming, setIsTrimming] = useState(false)

  // Measure page fill when resume changes
  useEffect(() => {
    if (rewrittenResume) {
      const fill = measurePageFill(rewrittenResume)
      setPageFill(fill)
    } else {
      setPageFill(null)
    }
  }, [rewrittenResume])

  // Handle trimming overflow content
  const handleTrimOverflow = async () => {
    if (!linesOver || !rewrittenResume) return
    
    const lines = parseInt(linesOver, 10)
    if (isNaN(lines) || lines <= 0) {
      setError('Please enter a valid number of lines')
      return
    }

    setIsTrimming(true)
    setError('')
    setShowTrimModal(false)

    try {
      // Calculate estimates for the prompt
      const bulletsToRemove = Math.ceil(lines / 1.5)
      const bulletsToShorten = Math.ceil(lines * 1.5)
      
      const systemPrompt = TRIM_PROMPT
        .replace(/{LINES_OVER}/g, lines.toString())
        .replace('{BULLETS_TO_REMOVE}', bulletsToRemove.toString())
        .replace('{BULLETS_TO_SHORTEN}', bulletsToShorten.toString())

      const userMessage = `Here is the resume that needs to be trimmed by approximately ${lines} lines:

${JSON.stringify(rewrittenResume, null, 2)}

Please trim this resume to fit on 1 page. Return ONLY the JSON object with the trimmed resume data.`

      const response = await callClaude(null, [{ role: 'user', content: userMessage }], systemPrompt)

      // Parse response
      const jsonMatch = response.match(/\{[\s\S]*"name"[\s\S]*\}/)
      if (jsonMatch) {
        const trimmedData = JSON.parse(jsonMatch[0])
        setRewrittenResume(trimmedData)
        setImprovements(`Trimmed ~${lines} lines: ${trimmedData.improvements || 'Content condensed to fit 1 page'}`)
        setLinesOver('')
      } else {
        throw new Error('Could not parse trimmed resume')
      }
    } catch (err) {
      setError(`Error trimming resume: ${err.message}`)
    } finally {
      setIsTrimming(false)
    }
  }

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

        // Check if contact info is missing (phone or email are essential)
        const contact = result.data.contact || {}
        const missingContact = !contact.phone || !contact.email
        if (missingContact) {
          // Pre-fill form with any existing values
          setContactForm({
            phone: contact.phone || '',
            email: contact.email || '',
            linkedin: contact.linkedin || ''
          })
          setShowContactPrompter(true)
        } else {
          // Check if resume has [ADD METRIC] placeholders
          const hasMetrics = JSON.stringify(result.data).includes('[ADD METRIC]')
          if (hasMetrics) {
            setShowMetricPrompter(true)
          }
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

  const handleContactSave = () => {
    // Update resume with contact info
    const updatedResume = {
      ...rewrittenResume,
      contact: {
        ...rewrittenResume.contact,
        phone: contactForm.phone || rewrittenResume.contact?.phone || null,
        email: contactForm.email || rewrittenResume.contact?.email || null,
        linkedin: contactForm.linkedin || rewrittenResume.contact?.linkedin || null
      }
    }
    setRewrittenResume(updatedResume)
    setShowContactPrompter(false)

    // Now check for metrics
    const hasMetrics = JSON.stringify(updatedResume).includes('[ADD METRIC]')
    if (hasMetrics) {
      setShowMetricPrompter(true)
    }
  }

  const handleContactSkip = () => {
    setShowContactPrompter(false)
    // Check for metrics even if contact was skipped
    const hasMetrics = JSON.stringify(rewrittenResume).includes('[ADD METRIC]')
    if (hasMetrics) {
      setShowMetricPrompter(true)
    }
  }

  const handleStartOver = () => {
    setFile(null)
    setRewrittenResume(null)
    setShowContactPrompter(false)
    setShowMetricPrompter(false)
    setContactForm({ phone: '', email: '', linkedin: '' })
    setImprovements('')
    setError('')
  }

  // Show contact prompter if contact info is missing
  if (showContactPrompter && rewrittenResume) {
    const missingFields = []
    if (!rewrittenResume.contact?.phone && !contactForm.phone) missingFields.push('phone')
    if (!rewrittenResume.contact?.email && !contactForm.email) missingFields.push('email')
    
    return (
      <div className="container" style={{ maxWidth: '600px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 className="page-title" style={{ fontSize: '24px', margin: 0, marginBottom: '8px' }}>
            Add Your Contact Info
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
            We noticed some contact details are missing from your resume. Add them below so recruiters can reach you.
          </p>
        </div>

        <div className="card" style={{ 
          background: 'linear-gradient(135deg, #fdfbf7 0%, #ffffff 100%)', 
          borderLeft: '4px solid var(--accent-purple)',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ 
              fontSize: '20px', 
              background: 'rgba(124, 58, 237, 0.1)', 
              color: 'var(--accent-purple)',
              minWidth: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              📱
            </div>
            <div>
              <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '4px' }}>
                Missing Fields
              </div>
              <p style={{ fontSize: '16px', color: 'var(--text-primary)', fontWeight: '500', lineHeight: '1.4' }}>
                {missingFields.length > 0 
                  ? `Please add your ${missingFields.join(' and ')}`
                  : 'Review and confirm your contact details'}
              </p>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: '700', 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em', 
                marginBottom: '8px', 
                color: 'var(--text-secondary)' 
              }}>
                Phone Number {!rewrittenResume.contact?.phone && <span style={{ color: '#ef4444' }}>*</span>}
              </label>
              <input
                type="tel"
                value={contactForm.phone}
                onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                placeholder="(555) 123-4567"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '16px',
                  border: '2px solid var(--border-color)',
                  borderRadius: '12px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent-purple)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
              />
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: '700', 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em', 
                marginBottom: '8px', 
                color: 'var(--text-secondary)' 
              }}>
                Email Address {!rewrittenResume.contact?.email && <span style={{ color: '#ef4444' }}>*</span>}
              </label>
              <input
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                placeholder="you@email.com"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '16px',
                  border: '2px solid var(--border-color)',
                  borderRadius: '12px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent-purple)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
              />
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: '700', 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em', 
                marginBottom: '8px', 
                color: 'var(--text-secondary)' 
              }}>
                LinkedIn URL <span style={{ fontWeight: '400', textTransform: 'none' }}>(optional)</span>
              </label>
              <input
                type="url"
                value={contactForm.linkedin}
                onChange={(e) => setContactForm({ ...contactForm, linkedin: e.target.value })}
                placeholder="linkedin.com/in/yourname"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '16px',
                  border: '2px solid var(--border-color)',
                  borderRadius: '12px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent-purple)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
              />
            </div>
          </div>

          <div className="button-group" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
            <button 
              className="btn btn-ghost" 
              onClick={handleContactSkip}
            >
              Skip for Now
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleContactSave}
              disabled={!contactForm.phone && !contactForm.email && !rewrittenResume.contact?.phone && !rewrittenResume.contact?.email}
            >
              Save & Continue →
            </button>
          </div>
        </div>
      </div>
    )
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

          {/* Page Fill Indicator */}
          {pageFill && (
            <div className="card-premium" style={{ 
              background: pageFill.status === 'overflow' ? '#fef2f2' : 
                         pageFill.status === 'tight' ? '#fffbeb' : '#f0fdf4',
              borderLeft: `4px solid ${
                pageFill.status === 'overflow' ? '#ef4444' : 
                pageFill.status === 'tight' ? '#f59e0b' : '#10b981'
              }`,
              padding: '16px 20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)' }}>
                  Page Fill: {pageFill.fillPercent}%
                </span>
                <span style={{ 
                  fontSize: '12px', 
                  padding: '2px 8px', 
                  borderRadius: '9999px',
                  background: pageFill.status === 'overflow' ? '#fee2e2' : 
                             pageFill.status === 'tight' ? '#fef3c7' : '#d1fae5',
                  color: pageFill.status === 'overflow' ? '#b91c1c' : 
                        pageFill.status === 'tight' ? '#92400e' : '#065f46'
                }}>
                  {pageFill.status === 'overflow' ? '⚠️ Over 1 page' : 
                   pageFill.status === 'tight' ? '📄 Tight fit' : '✓ Fits well'}
                </span>
              </div>
              {/* Progress bar */}
              <div style={{ 
                height: '8px', 
                background: '#e5e7eb', 
                borderRadius: '4px', 
                overflow: 'hidden',
                marginBottom: '8px'
              }}>
                <div style={{ 
                  width: `${Math.min(pageFill.fillPercent, 100)}%`, 
                  height: '100%',
                  background: pageFill.status === 'overflow' ? '#ef4444' : 
                             pageFill.status === 'tight' ? '#f59e0b' : '#10b981',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ 
                  fontSize: '13px', 
                  color: 'var(--text-secondary)', 
                  margin: 0 
                }}>
                  {pageFill.message}
                </p>
                {(pageFill.status === 'overflow' || pageFill.status === 'tight') && (
                  <button
                    onClick={() => setShowTrimModal(true)}
                    style={{
                      fontSize: '13px',
                      padding: '4px 12px',
                      background: 'var(--accent-purple)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    ✂️ Fix Overflow
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Trim Modal */}
          {showTrimModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div className="card" style={{ 
                maxWidth: '400px', 
                width: '90%', 
                padding: '24px',
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
              }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>✂️ Trim to Fit 1 Page</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
                  Download the resume, open in Word, and count how many lines it overflows. 
                  May will intelligently trim content to fit.
                </p>
                
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    fontWeight: '600', 
                    marginBottom: '6px',
                    color: 'var(--text-secondary)'
                  }}>
                    How many lines over 1 page?
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={linesOver}
                    onChange={(e) => setLinesOver(e.target.value)}
                    placeholder="e.g., 3"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      fontSize: '16px',
                      border: '2px solid var(--border-color)',
                      borderRadius: '8px',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--accent-purple)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                  />
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                    Tip: Each bullet is roughly 1-2 lines. 3 lines over ≈ trim 2 bullets.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button 
                    className="btn btn-ghost"
                    onClick={() => { setShowTrimModal(false); setLinesOver(''); }}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={handleTrimOverflow}
                    disabled={!linesOver || isTrimming}
                  >
                    {isTrimming ? 'Trimming...' : 'Trim Resume'}
                  </button>
                </div>
              </div>
            </div>
          )}

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
              <p style={{ color: 'var(--text-secondary)' }}>
                {[rewrittenResume.contact?.email, rewrittenResume.contact?.phone, rewrittenResume.contact?.linkedin]
                  .filter(Boolean)
                  .join(' | ') || 'No contact info provided'}
              </p>
              
              {rewrittenResume.education?.length > 0 && (
                <>
                  <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--border-subtle)' }} />
                  <strong style={{ fontSize: '15px', display: 'block', marginBottom: '8px' }}>Education</strong>
                  {rewrittenResume.education.map((edu, idx) => (
                    <div key={idx} style={{ marginBottom: '12px' }}>
                      <div><strong>{edu.institution}</strong> — {edu.degree}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {edu.location} | {edu.dates}
                      </div>
                      {edu.gpa && (
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          <strong>GPA:</strong> {edu.gpa}
                        </div>
                      )}
                      {edu.details && (
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          {edu.details}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}

              <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--border-subtle)' }} />
              <strong style={{ fontSize: '15px', display: 'block', marginBottom: '8px' }}>Experience</strong>

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

              {rewrittenResume.custom_sections?.length > 0 && (
                <>
                  <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--border-subtle)' }} />
                  {rewrittenResume.custom_sections.map((section, idx) => (
                    <div key={idx} style={{ marginBottom: '16px' }}>
                      <strong style={{ fontSize: '15px' }}>{section.title}</strong>
                      <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                        {section.content?.map((item, itemIdx) => (
                          <li key={itemIdx} style={{ marginBottom: '4px' }}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </>
              )}
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
