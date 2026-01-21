import { useState } from 'react'
import { callClaude } from '../utils/claudeApi'
import { generateDOCX } from '../utils/docxGenerator'

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

function BatchTailor({ apiKey, masterResume, onBack }) {
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
            apiKey,
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
          <button className="back-button" onClick={onBack}>
            ← Back to Home
          </button>
          <h1 className="page-title">Batch Tailor Resumes</h1>
          <p className="page-subtitle">Create multiple tailored resumes at once</p>
        </div>

        <div className="card">
          <div className="info-box" style={{ borderColor: '#ff6b6b', background: '#ffe0e0' }}>
            <div className="info-box-text" style={{ color: '#c92a2a' }}>
              No primary 1-page resume found. Please build a resume first before tailoring.
            </div>
          </div>
          <button className="btn btn-secondary" onClick={onBack} style={{ marginTop: 'var(--space-lg)' }}>
            Go Build a Resume
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: '900px' }}>
      <div className="page-header">
        <button className="back-button" onClick={onBack}>
          ← Back to Home
        </button>
        <h1 className="page-title">Batch Tailor Resumes</h1>
        <p className="page-subtitle">Create multiple tailored resumes for different jobs</p>
      </div>

      {!isTailoring && results.length === 0 && (
        <div className="card">
          <div className="card-title">Enter Job Descriptions</div>
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
              border: '2px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              resize: 'vertical',
              marginBottom: 'var(--space-lg)'
            }}
          />

          <div className="info-box" style={{ marginBottom: 'var(--space-lg)' }}>
            <div className="info-box-title">How it works:</div>
            <div className="info-box-text">
              • Paste each job description in the box above
              <br />
              • Separate different jobs with a blank line
              <br />
              • May will create a tailored resume for each job
              <br />
              • All resumes will download automatically
              <br />
              • This may take 1-2 minutes per job
            </div>
          </div>

          {error && (
            <div className="info-box" style={{ borderColor: '#ff6b6b', background: '#ffe0e0', marginBottom: 'var(--space-lg)' }}>
              <div className="info-box-text" style={{ color: '#c92a2a' }}>
                {error}
              </div>
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleBatchTailor}
            style={{ width: '100%' }}
            disabled={!jobDescriptions.trim()}
          >
            Generate Tailored Resumes
          </button>
        </div>
      )}

      {isTailoring && (
        <div className="card">
          <div className="card-title">Tailoring Resumes...</div>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div className="loading" style={{ width: '60px', height: '60px', margin: '0 auto 20px' }}></div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '18px', marginBottom: '10px' }}>
              Processing job descriptions
            </p>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>
              {results.length > 0 ? `Completed ${results.length} of ${jobDescriptions.split(/\n\s*\n/).filter(jd => jd.trim().length > 0).length}` : 'Starting...'}
            </p>
          </div>

          {results.length > 0 && (
            <div style={{ marginTop: 'var(--space-lg)' }}>
              {results.map((result, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 'var(--space-md)',
                    marginBottom: 'var(--space-sm)',
                    background: result.status === 'success' ? '#e8f5e9' : '#ffebee',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '14px'
                  }}
                >
                  <strong>{result.jobTitle}</strong>
                  <br />
                  {result.status === 'success' ? (
                    <span style={{ color: '#2e7d32' }}>✓ {result.fileName}</span>
                  ) : (
                    <span style={{ color: '#c62828' }}>✗ {result.error}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!isTailoring && results.length > 0 && (
        <div className="card">
          <div className="card-title">Batch Tailoring Complete!</div>

          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <p style={{ marginBottom: 'var(--space-md)', color: 'var(--text-secondary)' }}>
              Created {results.filter(r => r.status === 'success').length} tailored resume(s):
            </p>

            {results.map((result, idx) => (
              <div
                key={idx}
                style={{
                  padding: 'var(--space-md)',
                  marginBottom: 'var(--space-sm)',
                  background: result.status === 'success' ? '#e8f5e9' : '#ffebee',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '14px'
                }}
              >
                <strong>{result.jobTitle}</strong>
                <br />
                {result.status === 'success' ? (
                  <span style={{ color: '#2e7d32' }}>✓ {result.fileName}</span>
                ) : (
                  <span style={{ color: '#c62828' }}>✗ Failed: {result.error}</span>
                )}
              </div>
            ))}
          </div>

          <div className="button-group">
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
      )}
    </div>
  )
}

export default BatchTailor
