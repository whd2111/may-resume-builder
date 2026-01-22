import { useState } from 'react'
import { callClaude } from '../utils/claudeApi'
import { generateDOCX } from '../utils/docxGenerator'
import { ArrowLeftIcon, SparklesIcon, TargetIcon, DownloadIcon } from '../utils/icons'

// ... existing prompts ...

const BATCH_TAILOR_SYSTEM_PROMPT = `You are an expert at tailoring resumes for specific job descriptions. Your job is to take a primary 1-page resume and customize it for a specific job posting.

TAILORING RULES:
1. Keep all experience truthful - never fabricate or exaggerate
2. Reorder bullet points to prioritize most relevant experience
3. Adjust language to match job description keywords (but stay truthful)
4. Emphasize skills and accomplishments that match the job requirements
5. Remove or de-emphasize less relevant bullets if needed
6. Maintain strong action verbs and metrics
7. Keep the same format and structure as the primary 1-page resume

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

function BatchTailor({ masterResume, onBack }) {
  const [jobDescriptions, setJobDescriptions] = useState('')
  const [isTailoring, setIsTailoring] = useState(false)
  const [results, setResults] = useState([])
  const [error, setError] = useState('')

  const handleBatchTailor = async () => {
    if (!masterResume) {
      setError('No primary 1-page resume found. Please build a resume first.')
      return
    }

    if (!jobDescriptions.trim()) {
      setError('Please enter at least one job description.')
      return
    }

    setIsTailoring(true)
    setError('')
    setResults([])

    try {
      // Split job descriptions by double line breaks
      const jobs = jobDescriptions
        .split(/\n\s*\n/)
        .map(jd => jd.trim())
        .filter(jd => jd.length > 0)

      if (jobs.length === 0) {
        setError('No valid job descriptions found. Please separate job descriptions with blank lines.')
        setIsTailoring(false)
        return
      }

      const tailoredResumes = []

      for (let i = 0; i < jobs.length; i++) {
        const jobDesc = jobs[i]
        const jobTitle = extractJobTitle(jobDesc)

        try {
          // Call Claude to tailor the resume
          const prompt = `Here is the primary 1-page resume:\n\n${JSON.stringify(masterResume, null, 2)}\n\nHere is the job description:\n\n${jobDesc}\n\nPlease tailor this resume for this specific job. Return ONLY the tailored resume as a valid JSON object with no additional text.`

          const response = await callClaude(
            null,
            [{ role: 'user', content: prompt }],
            BATCH_TAILOR_SYSTEM_PROMPT
          )

          // Extract JSON from response
          const jsonMatch = response.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const tailoredData = JSON.parse(jsonMatch[0])

            // Generate DOCX for this tailored resume
            await generateDOCX(tailoredData, `resume_${jobTitle.replace(/[^a-zA-Z0-9]/g, '_')}.docx`)

            tailoredResumes.push({
              jobTitle,
              jobDescription: jobDesc,
              status: 'success',
              fileName: `resume_${jobTitle.replace(/[^a-zA-Z0-9]/g, '_')}.docx`
            })
          } else {
            throw new Error('Could not parse tailored resume')
          }
        } catch (err) {
          tailoredResumes.push({
            jobTitle,
            jobDescription: jobDesc,
            status: 'error',
            error: err.message
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

  const extractJobTitle = (jobDesc) => {
    // Try to extract a job title from the first line or first 100 characters
    const firstLine = jobDesc.split('\n')[0]
    if (firstLine.length > 0 && firstLine.length < 100) {
      return firstLine
    }
    return jobDesc.substring(0, 50).replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'Job'
  }

  if (!masterResume) {
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
          <button className="btn btn-primary" onClick={onBack} style={{ marginTop: 'var(--space-md)' }}>
            Go to Resume Builder
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: '900px' }}>
      <div className="page-header">
        {onBack && (
          <button className="back-button" onClick={onBack}>
            <ArrowLeftIcon />
            Back to Home
          </button>
        )}
        <h1 className="page-title">Batch Tailor Resumes</h1>
        <p className="page-subtitle">Create multiple tailored resumes for different jobs in one go</p>
      </div>

      {!isTailoring && results.length === 0 && (
        <div className="card-premium stagger-1">
          <div className="card-title">
            <TargetIcon />
            Enter Job Descriptions
          </div>
          <p style={{ marginBottom: 'var(--space-md)', color: 'var(--text-secondary)' }}>
            Paste multiple job descriptions below. Separate each job with a blank line.
          </p>

          <textarea
            placeholder="Software Engineer at TechCorp&#10;Looking for a skilled engineer...&#10;&#10;Product Manager at StartupXYZ&#10;We're seeking a product manager..."
            value={jobDescriptions}
            onChange={(e) => setJobDescriptions(e.target.value)}
            style={{
              width: '100%',
              minHeight: '300px',
              padding: 'var(--space-md)',
              fontSize: '16px',
              fontFamily: 'inherit',
              borderRadius: '24px',
              resize: 'vertical',
              marginBottom: 'var(--space-lg)',
              background: 'rgba(255,255,255,0.5)'
            }}
          />

          <div className="card-premium" style={{ marginBottom: 'var(--space-xl)', background: 'white' }}>
            <div className="card-title" style={{ fontSize: '16px' }}>
              <SparklesIcon />
              How it works:
            </div>
            <div className="info-box-text" style={{ fontSize: '14px', lineHeight: '1.7' }}>
              • Paste each job description in the box above
              <br />
              • Separate different jobs with a blank line
              <br />
              • May will create a tailored resume for each job
              <br />
              • All resumes will download automatically
            </div>
          </div>

          {error && (
            <div className="card" style={{ borderLeft: '4px solid #ef4444', background: '#fef2f2', marginBottom: 'var(--space-lg)' }}>
              <p style={{ color: '#b91c1c' }}>{error}</p>
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleBatchTailor}
            style={{ width: '100%' }}
            disabled={!jobDescriptions.trim()}
          >
            <SparklesIcon />
            Generate Tailored Resumes
          </button>
        </div>
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
              {results.length > 0 ? `Completed ${results.length} of ${jobDescriptions.split(/\n\s*\n/).filter(jd => jd.trim().length > 0).length}` : 'Starting batch process...'}
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
                  <span style={{ fontWeight: '600' }}>{result.jobTitle}</span>
                  {result.status === 'success' ? (
                    <span style={{ color: '#166534', fontWeight: '500' }}>✓ {result.fileName}</span>
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
              <SparklesIcon />
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
                <span>{result.jobTitle}</span>
                {result.status === 'success' ? (
                  <span style={{ color: 'var(--accent-primary)', fontWeight: '600' }}><DownloadIcon /></span>
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
                  setJobDescriptions('')
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
