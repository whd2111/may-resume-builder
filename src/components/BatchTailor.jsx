import { useState } from 'react'
import { callClaude } from '../utils/claudeApi'
import { generateDOCX } from '../utils/docxGenerator'
import { ArrowLeftIcon, WritingIcon, TargetIcon, DownloadIcon, CheckIcon } from '../utils/icons'
import { useApplications } from '../hooks/useApplications'

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

/**
 * Sort experience array in reverse chronological order
 * Present jobs come first, then sorted by end year descending
 */
function sortExperienceChronologically(experience) {
  if (!experience || !Array.isArray(experience)) return experience
  
  return [...experience].sort((a, b) => {
    const parseDate = (dateStr) => {
      if (!dateStr) return { start: 0, end: 0, isPresent: false }
      const isPresent = /present/i.test(dateStr)
      const years = dateStr.match(/\d{4}/g) || []
      const start = years[0] ? parseInt(years[0], 10) : 0
      const end = isPresent ? 9999 : (years[1] ? parseInt(years[1], 10) : start)
      return { start, end, isPresent }
    }
    
    const aDate = parseDate(a.dates)
    const bDate = parseDate(b.dates)
    
    if (aDate.isPresent && !bDate.isPresent) return -1
    if (!aDate.isPresent && bDate.isPresent) return 1
    if (aDate.isPresent && bDate.isPresent) return bDate.start - aDate.start
    if (bDate.end !== aDate.end) return bDate.end - aDate.end
    return bDate.start - aDate.start
  })
}

const BATCH_TAILOR_SYSTEM_PROMPT = `You are an expert at tailoring resumes for specific job descriptions. Your job is to take a primary 1-page resume and customize it for a specific job posting.

TAILORING RULES:
1. Keep all experience truthful - never fabricate or exaggerate
2. Reorder bullet points to prioritize most relevant experience
3. Adjust language to match job description keywords (but stay truthful)
4. Emphasize skills and accomplishments that match the job requirements
5. Remove or de-emphasize less relevant bullets if needed
6. Maintain strong action verbs and metrics
7. Keep the same format and structure as the primary 1-page resume
8. **PAST TENSE REQUIRED**: All bullets for completed/past positions MUST use past tense (led, built, drove, managed, designed)
9. **NO PLACEHOLDERS OR BROKEN OUTPUT**: 
   - NEVER output placeholder text like [ADD NUMBER], [ADD %], [ADD OUTCOME], [ADD SCOPE]
   - NEVER include internal thoughts or uncertainty ("I don't have data", "let's not do it", "not 100% sure")
   - NEVER write numbered lists within prose (bad: "for 1. programs, 2. dollars" | good: "for 10 programs")
   - Each bullet must be a complete, polished, natural-sounding sentence
   - If a metric is missing, write a strong bullet WITHOUT it - do NOT include partial/broken text
10. **FILL THE LINE**: Aim for 1-2 full lines per bullet. Don't make bullets too short.
11. **ONE PAGE**: Ensure final resume fits on ONE PAGE maximum.

IMPORTANT: Return the tailored resume in the SAME JSON format as the input, with the same structure. Only modify the content, not the format.

Output the tailored resume as a valid JSON object with this structure:
{
  "name": "Full Name",
  "contact": {
    "phone": "123-456-7890",
    "email": "email@example.com",
    "linkedin": "linkedin.com/in/username"
  },
  "education": [...],
  "experience": [...],
  "skills": "...",
  "additional": "..."
}`;

function BatchTailor({ primaryResume, onBack, onNavigate }) {
  const { createApplication } = useApplications()
  const [jobs, setJobs] = useState([
    { id: 1, company: '', description: '' }
  ])
  const [isTailoring, setIsTailoring] = useState(false)
  const [results, setResults] = useState([])
  const [error, setError] = useState('')
  const [saveOption, setSaveOption] = useState('both') // 'download', 'save', 'both'

  const addJob = () => {
    const newId = Math.max(...jobs.map(j => j.id), 0) + 1
    setJobs([...jobs, { id: newId, company: '', description: '' }])
  }

  const removeJob = (id) => {
    if (jobs.length === 1) return // Keep at least one job
    setJobs(jobs.filter(j => j.id !== id))
  }

  const updateJob = (id, field, value) => {
    setJobs(jobs.map(j => j.id === id ? { ...j, [field]: value } : j))
  }

  const handleBatchTailor = async () => {
    if (!primaryResume) {
      setError('No primary 1-page resume found. Please build a resume first.')
      return
    }

    // Filter out empty job descriptions
    const validJobs = jobs.filter(j => j.description.trim().length > 0)

    if (validJobs.length === 0) {
      setError('Please enter at least one job description.')
      return
    }

    setIsTailoring(true)
    setError('')
    setResults([])

    try {
      const tailoredResumes = []

      for (let i = 0; i < validJobs.length; i++) {
        const job = validJobs[i]
        const companyName = job.company.trim() || extractCompanyName(job.description)

        try {
          // Call Claude to tailor the resume
          const prompt = `Here is the primary 1-page resume:\n\n${JSON.stringify(primaryResume, null, 2)}\n\nHere is the job description:\n\n${job.description}\n\nPlease tailor this resume for this specific job. Return ONLY the tailored resume as a valid JSON object with no additional text.`

          const response = await callClaude(
            null,
            [{ role: 'user', content: prompt }],
            BATCH_TAILOR_SYSTEM_PROMPT
          )

          // Extract JSON from response
          const jsonMatch = response.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const tailoredData = JSON.parse(jsonMatch[0])
            
            // CRITICAL: Sort experience in reverse chronological order (Present first)
            if (tailoredData.experience) {
              tailoredData.experience = sortExperienceChronologically(tailoredData.experience)
            }

            // Extract job title from description
            const jobTitle = extractJobTitle(job.description)

            // Try to generate document - if overflow, auto-trim and retry
            let finalTailoredData = tailoredData
            
            try {
              // Download if requested
              if (saveOption === 'download' || saveOption === 'both') {
                await generateDOCX(finalTailoredData, null, companyName)
              }
            } catch (docError) {
              // If overflow, auto-trim and retry once
              if (docError.code === 'RESUME_OVERFLOW') {
                console.log(`📏 Overflow detected for ${companyName} - auto-trimming...`)
                
                try {
                  // Calculate trim amount
                  const linesToTrim = Math.ceil(docError.overflowPercent / 2)
                  
                  const trimPrompt = TRIM_PROMPT
                    .replace(/{LINES_OVER}/g, linesToTrim.toString())
                    .replace('{BULLETS_TO_REMOVE}', Math.ceil(linesToTrim / 1.5).toString())
                    .replace('{BULLETS_TO_SHORTEN}', Math.ceil(linesToTrim * 1.5).toString())

                  const trimMessage = `Here is the resume that needs to be trimmed by approximately ${linesToTrim} lines:

${JSON.stringify(tailoredData, null, 2)}

Please trim this resume to fit on 1 page. Return ONLY the JSON object with the trimmed resume data.`

                  const trimResponse = await callClaude(null, [{ role: 'user', content: trimMessage }], trimPrompt)
                  
                  const trimMatch = trimResponse.match(/\{[\s\S]*"name"[\s\S]*\}/)
                  if (trimMatch) {
                    const trimmedData = JSON.parse(trimMatch[0])
                    finalTailoredData = {
                      ...trimmedData,
                      experience: sortExperienceChronologically(trimmedData.experience)
                    }
                    
                    // Retry document generation with trimmed data
                    if (saveOption === 'download' || saveOption === 'both') {
                      await generateDOCX(finalTailoredData, null, companyName)
                    }
                    
                    console.log(`✅ Auto-trim successful for ${companyName}`)
                  } else {
                    throw new Error('Auto-trim failed - could not parse trimmed resume')
                  }
                } catch (trimError) {
                  // If trim fails or still overflows, throw original error
                  throw docError
                }
              } else {
                throw docError
              }
            }

            // Save to database if requested (use finalTailoredData which may be trimmed)
            if (saveOption === 'save' || saveOption === 'both') {
              await createApplication({
                job_description: job.description,
                company_name: companyName,
                job_title: jobTitle,
                checklist_json: null,
                selection_json: null,
                resume_id: null,
                tailored_resume_data: finalTailoredData,
                status: 'tailored',
              })
            }

            tailoredResumes.push({
              company: companyName,
              jobTitle: jobTitle,
              status: 'success',
              fileName: `${finalTailoredData.name.split(' ').pop().toUpperCase()}_${finalTailoredData.name.split(' ')[0].toUpperCase()}_${companyName.toUpperCase().replace(/[^A-Z0-9]/g, '')}.docx`
            })
          } else {
            throw new Error('Could not parse tailored resume')
          }
        } catch (err) {
          // Provide specific error message for overflow
          let errorMsg = err.message
          if (err.code === 'RESUME_OVERFLOW') {
            errorMsg = `Content too long by ${err.overflowPercent}% - auto-trim failed, still exceeds 1-page limit`
          }
          
          tailoredResumes.push({
            company: companyName,
            status: 'error',
            error: errorMsg
          })
        }

        setResults([...tailoredResumes])
      }
    } catch (err) {
      setError(`Error during batch tailoring: ${err.message}`)
    } finally {
      setIsTailoring(false)
    }
  }

  const extractCompanyName = (description) => {
    // Try to extract company name from job description
    const match = description.match(/(?:at|for|with|@)\s+([A-Z][A-Za-z\s&]+?)(?:\s+is|\s+seeks|\s+looking|\.|,|$)/i)
    return match ? match[1].trim() : 'COMPANY'
  }

  const extractJobTitle = (description) => {
    // Try to extract job title from description
    const patterns = [
      /(?:Job Title|Position|Role):\s*([^\n]+)/i,
      /(?:hiring|seeking|looking for)\s+(?:a\s+)?([A-Z][A-Za-z\s]+?)(?:\s+to|\s+who|\s+with|\.|,)/i,
    ]
    
    for (const pattern of patterns) {
      const match = description.match(pattern)
      if (match) {
        return match[1].trim()
      }
    }
    
    return 'Position'
  }

  if (!primaryResume) {
    return (
      <div className="container">
        <div className="page-header">
          {onBack && (
            <button className="back-button" onClick={onBack}>
              <ArrowLeftIcon />
              Back to Home
            </button>
          )}
          <h1 className="page-title">Batch Tailor Resumes</h1>
          <p className="page-subtitle">Create multiple tailored resumes at once</p>
        </div>

        <div className="card-premium" style={{ borderLeft: '4px solid #ef4444' }}>
          <p style={{ color: '#b91c1c', fontWeight: '500' }}>
            No primary resume found. Please build one first to enable batch tailoring.
          </p>
          <button className="btn btn-primary" onClick={() => onNavigate('build')} style={{ marginTop: 'var(--space-md)' }}>
            Go to Resume Builder
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: '900px' }}>
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
        <h1 className="page-title">Batch Tailor Resumes</h1>
        <p className="page-subtitle">Create multiple tailored resumes for different jobs</p>
      </div>

      {!isTailoring && results.length === 0 && (
        <>
          <div className="card-premium stagger-1" style={{ marginBottom: 'var(--space-lg)', background: 'white' }}>
            <div className="card-title" style={{ fontSize: '16px' }}>
              <WritingIcon />
              How it works:
            </div>
            <div className="info-box-text" style={{ fontSize: '14px', lineHeight: '1.7' }}>
              • Add a job card for each position you're applying to
              <br />
              • Enter the company name (optional but helps with filenames)
              <br />
              • Paste the full job description
              <br />
              • May will create a perfectly tailored resume for each job
              <br />
              • All resumes download automatically with proper filenames
            </div>
          </div>

          {jobs.map((job, index) => (
            <div 
              key={job.id} 
              className="card-premium stagger-2" 
              style={{ 
                marginBottom: 'var(--space-lg)',
                borderLeft: '4px solid var(--accent-primary)'
              }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: 'var(--space-lg)'
              }}>
                <div className="card-title">
                  <TargetIcon />
                  Job {index + 1}
                </div>
                {jobs.length > 1 && (
                  <button
                    onClick={() => removeJob(job.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-tertiary)',
                      cursor: 'pointer',
                      fontSize: '24px',
                      padding: '0',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
                      e.currentTarget.style.color = '#ef4444'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'none'
                      e.currentTarget.style.color = 'var(--text-tertiary)'
                    }}
                  >
                    ×
                  </button>
                )}
              </div>

              <div style={{ marginBottom: 'var(--space-md)' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: 'var(--space-sm)',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>
                  Company Name (Optional)
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., Electronic Arts, Google, Microsoft"
                  value={job.company}
                  onChange={(e) => updateJob(job.id, 'company', e.target.value)}
                  style={{
                    width: '100%',
                    fontSize: '15px'
                  }}
                />
                <small style={{ 
                  display: 'block',
                  marginTop: 'var(--space-xs)',
                  color: 'var(--text-tertiary)',
                  fontSize: '13px'
                }}>
                  Helps create better filenames: DUBBS_WILL_GOOGLE.docx
                </small>
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: 'var(--space-sm)',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>
                  Job Description *
                </label>
                <textarea
                  placeholder="Paste the full job description here..."
                  value={job.description}
                  onChange={(e) => updateJob(job.id, 'description', e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '200px',
                    padding: 'var(--space-md)',
                    fontSize: '15px',
                    fontFamily: 'inherit',
                    borderRadius: '16px',
                    resize: 'vertical',
                    background: 'rgba(255,255,255,0.5)',
                    border: '1px solid var(--border-subtle)'
                  }}
                />
              </div>
            </div>
          ))}

          <button
            onClick={addJob}
            className="btn btn-secondary"
            style={{ 
              width: '100%',
              marginBottom: 'var(--space-xl)'
            }}
          >
            + Add Another Job
          </button>

          {error && (
            <div className="card" style={{ 
              borderLeft: '4px solid #ef4444', 
              background: '#fef2f2', 
              marginBottom: 'var(--space-lg)' 
            }}>
              <p style={{ color: '#b91c1c' }}>{error}</p>
            </div>
          )}

          <div className="card-premium" style={{ marginBottom: 'var(--space-lg)', background: 'rgba(99, 102, 241, 0.05)' }}>
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: 'var(--space-sm)',
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--text-primary)'
              }}>
                <CheckIcon style={{ width: '16px', height: '16px', display: 'inline', marginRight: '6px' }} />
                Save Options
              </label>
              <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="saveOption" 
                    value="both" 
                    checked={saveOption === 'both'}
                    onChange={(e) => setSaveOption(e.target.value)}
                  />
                  <span style={{ fontSize: '14px' }}>Download & Save to Dashboard</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="saveOption" 
                    value="save" 
                    checked={saveOption === 'save'}
                    onChange={(e) => setSaveOption(e.target.value)}
                  />
                  <span style={{ fontSize: '14px' }}>Save to Dashboard Only</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="saveOption" 
                    value="download" 
                    checked={saveOption === 'download'}
                    onChange={(e) => setSaveOption(e.target.value)}
                  />
                  <span style={{ fontSize: '14px' }}>Download Only</span>
                </label>
              </div>
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleBatchTailor}
            style={{ width: '100%' }}
            disabled={jobs.every(j => !j.description.trim())}
          >
            <WritingIcon />
            Generate {jobs.filter(j => j.description.trim()).length} Tailored Resume{jobs.filter(j => j.description.trim()).length !== 1 ? 's' : ''}
          </button>
        </>
      )}

      {isTailoring && (
        <div className="card-premium">
          <div className="card-title">
            <TargetIcon />
            Tailoring Resumes...
          </div>
          <div style={{ textAlign: 'center', padding: 'var(--space-2xl) 0' }}>
            <div className="loading" style={{ margin: '0 auto var(--space-xl)' }}></div>
            <p style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: '500', marginBottom: '8px' }}>
              Processing job descriptions
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
              {results.length > 0 ? `Completed ${results.length} of ${jobs.filter(j => j.description.trim()).length}` : 'Starting batch process...'}
            </p>
          </div>

          {results.length > 0 && (
            <div style={{ marginTop: 'var(--space-xl)' }}>
              {results.map((result, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '16px',
                    marginBottom: '10px',
                    background: result.status === 'success' ? '#f0fdf4' : '#fef2f2',
                    border: result.status === 'success' ? '1px solid #bbf7d0' : '1px solid #fecaca',
                    borderRadius: '16px',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span style={{ fontWeight: '600' }}>{result.company}</span>
                  {result.status === 'success' ? (
                    <span style={{ color: '#166534', fontWeight: '500' }}>✓ Downloaded</span>
                  ) : (
                    <span style={{ color: '#991b1b', fontWeight: '500' }}>✗ {result.error}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!isTailoring && results.length > 0 && (
        <div className="stagger-1">
          <div className="card-premium" style={{ borderLeft: '4px solid #10b981', background: '#f0fdf4' }}>
            <div className="card-title" style={{ color: '#065f46' }}>
              <WritingIcon />
              Batch Process Complete!
            </div>
            <p style={{ color: '#065f46', fontSize: '16px' }}>
              Created {results.filter(r => r.status === 'success').length} tailored resume(s) successfully.
            </p>
          </div>

          <div className="card-premium">
            <div className="card-title">Summary</div>
            {results.map((result, idx) => (
              <div
                key={idx}
                style={{
                  padding: '16px',
                  marginBottom: '10px',
                  background: result.status === 'success' ? '#f8fafc' : '#fef2f2',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '16px',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>{result.company}</div>
                  {result.status === 'success' && (
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{result.fileName}</div>
                  )}
                </div>
                {result.status === 'success' ? (
                  <span style={{ color: 'var(--accent-primary)', fontWeight: '600' }}>
                    <DownloadIcon />
                  </span>
                ) : (
                  <span style={{ color: '#ef4444' }}>Error</span>
                )}
              </div>
            ))}

            <div className="button-group" style={{ marginTop: 'var(--space-2xl)' }}>
              <button className="btn btn-secondary" onClick={onBack}>
                Back to Home
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setResults([])
                  setJobs([{ id: 1, company: '', description: '' }])
                }}
              >
                Tailor More Jobs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BatchTailor
