import { useState } from 'react'
import { callClaude } from '../utils/claudeApi'
import { generateDOCX } from '../utils/docxGenerator'
import { ArrowLeftIcon, TargetIcon, SparklesIcon, DownloadIcon } from '../utils/icons'

// ... existing prompts ...

const TAILORING_PROMPT = `You are May, an expert resume tailoring assistant. You have the user's primary 1-page resume and a job description. Your task is to tailor the resume bullets to align with the job requirements while maintaining truthfulness.

TAILORING RULES:
1. Analyze the job description for key skills, requirements, and keywords
2. Rewrite bullet points to emphasize relevant experience and skills
3. Use language and terminology from the job description where appropriate
4. NEVER fabricate experience - only reframe and emphasize existing accomplishments
5. Maintain the "did X by Y as shown by Z" framework
6. Keep bullets to MAX 2 lines
7. Use action verbs and metrics
8. Prioritize the most relevant experiences for this specific role

Respond with a JSON object in this EXACT format:
{
  "action": "tailored_resume",
  "data": {
    "name": "Full Name",
    "contact": {...},
    "education": [...],
    "experience": [
      {
        "company": "Company Name",
        "title": "Job Title",
        "location": "City, ST",
        "dates": "YYYY - YYYY",
        "bullets": [
          "Tailored bullet emphasizing relevant skills for this job",
          "Another tailored achievement with metrics"
        ]
      }
    ],
    "skills": "Skills relevant to this job",
    "additional": "..."
  },
  "explanation": "Brief explanation of key changes made to tailor this resume"
}`;

function Stage2Tailor({ primaryResume, onBack }) {
  const [jobDescription, setJobDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [tailoredResume, setTailoredResume] = useState(null)
  const [explanation, setExplanation] = useState('')
  const [showComparison, setShowComparison] = useState(true)

  const handleTailor = async (e) => {
    e.preventDefault()
    if (!jobDescription.trim()) return

    setIsLoading(true)
    setTailoredResume(null)
    setExplanation('')

    try {
      const prompt = `Here is the primary 1-page resume data:
${JSON.stringify(primaryResume, null, 2)}

Here is the job description:
${jobDescription}

Please tailor this resume for the job description.`

      const response = await callClaude(null, [{ role: 'user', content: prompt }], TAILORING_PROMPT)

      // Parse the response
      const jsonMatch = response.match(/\{[\s\S]*"action":\s*"tailored_resume"[\s\S]*\}/)
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0])
        setTailoredResume(result.data)
        setExplanation(result.explanation || 'Resume tailored successfully!')
      } else {
        throw new Error('Could not parse tailoring response')
      }
    } catch (error) {
      alert(`Error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async () => {
    try {
      // Extract company name from job description (look for common patterns)
      const companyMatch = jobDescription.match(/(?:at|for|with|@)\s+([A-Z][A-Za-z\s&]+?)(?:\s+is|\s+seeks|\s+looking|\.|,|$)/i)
      const companyName = companyMatch ? companyMatch[1].trim() : 'TAILORED'
      
      await generateDOCX(tailoredResume, null, companyName)
      alert('Resume downloaded successfully!')
    } catch (error) {
      alert(`Error generating document: ${error.message}`)
    }
  }

  // Helper to check if bullet changed
  const getBulletComparison = (expIndex, bulletIndex) => {
    if (!primaryResume.experience[expIndex]) return { changed: false, original: null }

    const originalBullets = primaryResume.experience[expIndex].bullets || []
    const tailoredBullets = tailoredResume.experience[expIndex].bullets || []

    const original = originalBullets[bulletIndex]
    const tailored = tailoredBullets[bulletIndex]

    if (!original || !tailored) return { changed: true, original }

    // Simple comparison - could be made more sophisticated
    const changed = original.trim() !== tailored.trim()
    return { changed, original }
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
        <h1 className="page-title">Tailor Your Resume</h1>
        <p className="page-subtitle">
          {primaryResume
            ? "Paste a job description and May will customize your resume to match the requirements"
            : "You need to build a primary 1-page resume first before tailoring"}
        </p>
      </div>

      {!masterResume && (
        <div className="card-premium" style={{ borderLeft: '4px solid #ef4444' }}>
          <p style={{ color: '#b91c1c', fontWeight: '500' }}>
            No primary resume found. Please build one first to enable tailoring.
          </p>
          <button className="btn btn-primary" onClick={onBack} style={{ marginTop: 'var(--space-md)' }}>
            Go to Resume Builder
          </button>
        </div>
      )}

      {masterResume && (
        <>
          {!tailoredResume && !isLoading && (
            <div className="card-premium">
              <div className="card-title">
                <TargetIcon />
                Job Description
              </div>
              <p style={{ marginBottom: 'var(--space-lg)', color: 'var(--text-secondary)', fontSize: '15px' }}>
                Paste the full job posting below. May will analyze key skills and reframe your accomplishments to stand out to recruiters.
              </p>

              <form onSubmit={handleTailor}>
                <div style={{ position: 'relative', marginBottom: 'var(--space-md)' }}>
                  <textarea
                    id="jobDescription"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the full job description here...&#10;&#10;Include:&#10;• Job title and company&#10;• Responsibilities&#10;• Required qualifications"
                    required
                    style={{
                      width: '100%',
                      minHeight: '300px',
                      fontSize: '15px',
                      lineHeight: '1.6',
                      borderRadius: '24px',
                      background: jobDescription.trim() ? 'white' : 'rgba(255,255,255,0.5)'
                    }}
                  />

                  {jobDescription.trim() && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setJobDescription('')}
                      style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        borderRadius: '12px'
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!jobDescription.trim()}
                  style={{ width: '100%' }}
                >
                  <SparklesIcon />
                  Tailor Resume Now
                </button>
              </form>
            </div>
          )}

          {isLoading && (
            <div style={{ textAlign: 'center', padding: 'var(--space-3xl) var(--space-xl)' }}>
              <div className="action-card-icon" style={{ margin: '0 auto var(--space-xl)', background: 'var(--gradient-primary)', color: 'white' }}>
                <TargetIcon />
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '20px', fontWeight: '500' }}>
                Analyzing job description and tailoring your resume...
              </p>
              <div className="loading" style={{ marginTop: 'var(--space-lg)' }}></div>
            </div>
          )}

          {tailoredResume && (
            <div className="stagger-1">
              <div className="card-premium" style={{ borderLeft: '4px solid #10b981', background: '#f0fdf4' }}>
                <div className="card-title" style={{ color: '#065f46' }}>
                  <SparklesIcon />
                  Tailoring Complete
                </div>
                <p style={{ color: '#065f46', fontSize: '15px', lineHeight: '1.6' }}>{explanation}</p>
              </div>

              <div style={{ marginBottom: 'var(--space-xl)', textAlign: 'center' }}>
                <button
                  onClick={() => setShowComparison(!showComparison)}
                  className="btn-secondary"
                  style={{ fontSize: '14px', padding: '8px 16px' }}
                >
                  {showComparison ? 'Hide Changes' : 'Show Highlighted Changes'}
                </button>
              </div>

              {/* Resume Preview with refined styles */}
              <div className="card-premium" style={{ padding: 'var(--space-2xl)', background: 'white' }}>
                <div style={{ textAlign: 'center', borderBottom: '2px solid var(--text-primary)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                  <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: 'var(--space-xs)' }}>{tailoredResume.name}</h1>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {tailoredResume.contact.phone} | {tailoredResume.contact.email}
                    {tailoredResume.contact.linkedin && ` | ${tailoredResume.contact.linkedin}`}
                  </p>
                </div>

                {/* Simplified preview sections for brevity */}
                {tailoredResume.experience && tailoredResume.experience.map((exp, expIdx) => (
                  <div key={expIdx} style={{ marginBottom: 'var(--space-lg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                      <span>{exp.company}</span>
                      <span>{exp.location}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontStyle: 'italic', marginBottom: 'var(--space-sm)' }}>
                      <span>{exp.title}</span>
                      <span>{exp.dates}</span>
                    </div>
                    <ul style={{ paddingLeft: '20px' }}>
                      {exp.bullets.map((bullet, bulletIdx) => {
                        const comparison = getBulletComparison(expIdx, bulletIdx)
                        const isChanged = comparison.changed
                        return (
                          <li key={bulletIdx} style={{ 
                            fontSize: '14px', 
                            marginBottom: '6px',
                            background: showComparison && isChanged ? '#fff7ed' : 'transparent',
                            padding: showComparison && isChanged ? '4px 8px' : '0',
                            borderRadius: '4px',
                            borderLeft: showComparison && isChanged ? '3px solid #f97316' : 'none'
                          }}>
                            {bullet}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="button-group" style={{ marginTop: 'var(--space-xl)' }}>
                <button onClick={handleDownload} className="btn btn-primary">
                  <DownloadIcon />
                  Download Tailored DOCX
                </button>
                <button 
                  onClick={() => { setTailoredResume(null); setJobDescription(''); }} 
                  className="btn btn-secondary"
                >
                  Tailor for Another Job
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Stage2Tailor
