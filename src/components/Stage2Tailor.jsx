import { useState } from 'react'
import { callClaude } from '../utils/claudeApi'
import { generateDOCX } from '../utils/docxGenerator'

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

function Stage2Tailor({ masterResume, onBack }) {
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
${JSON.stringify(masterResume, null, 2)}

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
      await generateDOCX(tailoredResume, 'tailored_resume.docx')
      alert('Resume downloaded successfully!')
    } catch (error) {
      alert(`Error generating document: ${error.message}`)
    }
  }

  // Helper to check if bullet changed
  const getBulletComparison = (expIndex, bulletIndex) => {
    if (!masterResume.experience[expIndex]) return { changed: false, original: null }

    const originalBullets = masterResume.experience[expIndex].bullets || []
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
      <div className="page-header">
        {onBack && (
          <button className="back-button" onClick={onBack}>
            ← Back to Home
          </button>
        )}
        <h1 className="page-title">Tailor for a Specific Job</h1>
        <p className="page-subtitle">
          {masterResume
            ? "Paste any job description below and May will customize your resume for that role"
            : "You need to build a primary 1-page resume first before tailoring"}
        </p>
      </div>

      {!masterResume && (
        <div className="info-box" style={{ borderColor: '#ff6b6b', background: '#ffe0e0' }}>
          <div className="info-box-text" style={{ color: '#c92a2a' }}>
            No primary 1-page resume found. Please build a resume first using the "Build a Resume" option.
          </div>
        </div>
      )}

      {masterResume && (
        <>
          {!tailoredResume && !isLoading && (
            <div className="card">
              <div className="card-title">Paste Job Description</div>
              <p style={{ marginBottom: 'var(--space-lg)', color: 'var(--text-secondary)', fontSize: '15px' }}>
                Copy the full job posting from LinkedIn, Indeed, or company website and paste it below. May will analyze the requirements and customize your resume to match.
              </p>

              <form onSubmit={handleTailor}>
                <div style={{ position: 'relative', marginBottom: 'var(--space-md)' }}>
                  <textarea
                    id="jobDescription"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the full job description here...&#10;&#10;Include:&#10;• Job title and company&#10;• Responsibilities&#10;• Required qualifications&#10;• Preferred skills&#10;• Any other relevant details"
                    required
                    style={{
                      width: '100%',
                      minHeight: '350px',
                      padding: 'var(--space-md)',
                      paddingRight: '50px',
                      fontSize: '15px',
                      lineHeight: '1.6',
                      fontFamily: 'inherit',
                      border: jobDescription.trim() ? '2px solid #3b82f6' : '2px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      resize: 'vertical',
                      transition: 'border-color 0.2s',
                      background: jobDescription.trim() ? '#f0f9ff' : '#ffffff'
                    }}
                  />

                  {jobDescription.trim() && (
                    <button
                      type="button"
                      onClick={() => setJobDescription('')}
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        padding: '4px 8px',
                        fontSize: '12px',
                        color: '#666',
                        background: '#f3f4f6',
                        border: '1px solid #e5e7eb',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#e5e7eb'
                        e.target.style.color = '#333'
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = '#f3f4f6'
                        e.target.style.color = '#666'
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>

                {jobDescription.trim() && (
                  <div style={{
                    fontSize: '13px',
                    color: '#059669',
                    marginBottom: 'var(--space-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span>✓</span>
                    <span>{jobDescription.trim().split(/\s+/).length} words • {jobDescription.length} characters</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!jobDescription.trim()}
                  style={{ width: '100%', fontSize: '16px', padding: '14px' }}
                >
                  Tailor Resume for This Job →
                </button>
              </form>

              <div className="info-box" style={{ marginTop: 'var(--space-lg)' }}>
                <div className="info-box-title">💡 Tips for best results:</div>
                <div className="info-box-text">
                  • Include the complete job posting (don't just paste the title)
                  <br />
                  • More detail = better tailoring
                  <br />
                  • May will preserve all facts while emphasizing relevant skills
                </div>
              </div>
            </div>
          )}

          {isLoading && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="loading" style={{ width: '40px', height: '40px', margin: '0 auto 16px' }}></div>
              <p style={{ color: '#666' }}>Analyzing job description and tailoring your resume...</p>
            </div>
          )}

          {tailoredResume && (
            <>
              <div className="success-message">
                <strong>✓ Resume Tailored Successfully!</strong>
                <p style={{ marginTop: '8px', fontSize: '14px' }}>{explanation}</p>
              </div>

              <div style={{ marginBottom: 'var(--space-lg)', textAlign: 'center' }}>
                <button
                  onClick={() => setShowComparison(!showComparison)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-purple)',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontSize: '14px'
                  }}
                >
                  {showComparison ? 'Hide Changes' : 'Show Changes'}
                </button>
              </div>

              <div className="resume-preview">
                <div className="resume-header">
                  <h1>{tailoredResume.name}</h1>
                  <p>
                    {tailoredResume.contact.phone} | {tailoredResume.contact.email}
                    {tailoredResume.contact.linkedin && ` | ${tailoredResume.contact.linkedin}`}
                  </p>
                </div>

                {tailoredResume.education && tailoredResume.education.length > 0 && (
                  <div className="resume-section">
                    <h2>Education</h2>
                    {tailoredResume.education.map((edu, idx) => (
                      <div key={idx} className="resume-item">
                        <div className="resume-item-header">
                          <span><strong>{edu.institution}</strong></span>
                          <span>{edu.location}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                          <span>{edu.degree}</span>
                          <span>{edu.dates}</span>
                        </div>
                        {edu.details && <div style={{ fontSize: '14px', marginTop: '4px' }}>{edu.details}</div>}
                      </div>
                    ))}
                  </div>
                )}

                {tailoredResume.experience && tailoredResume.experience.length > 0 && (
                  <div className="resume-section">
                    <h2>Experience</h2>
                    {tailoredResume.experience.map((exp, expIdx) => (
                      <div key={expIdx} className="resume-item">
                        <div className="resume-item-header">
                          <span><strong>{exp.company}</strong></span>
                          <span>{exp.location}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                          <span><em>{exp.title}</em></span>
                          <span>{exp.dates}</span>
                        </div>
                        {exp.bullets && exp.bullets.length > 0 && (
                          <ul style={{ marginBottom: 0 }}>
                            {exp.bullets.map((bullet, bulletIdx) => {
                              const comparison = getBulletComparison(expIdx, bulletIdx)
                              const isChanged = comparison.changed

                              return (
                                <div key={bulletIdx}>
                                  <li style={{
                                    background: showComparison && isChanged ? '#fffbea' : 'transparent',
                                    borderLeft: showComparison && isChanged ? '3px solid #f59e0b' : 'none',
                                    paddingLeft: showComparison && isChanged ? '12px' : '0',
                                    marginBottom: '8px',
                                    transition: 'all 0.2s'
                                  }}>
                                    {bullet}
                                  </li>
                                  {showComparison && isChanged && comparison.original && (
                                    <div style={{
                                      fontSize: '13px',
                                      color: '#666',
                                      marginLeft: '20px',
                                      marginTop: '-4px',
                                      marginBottom: '12px',
                                      padding: '8px',
                                      background: '#f3f4f6',
                                      borderRadius: '4px',
                                      fontStyle: 'italic'
                                    }}>
                                      <strong>Original:</strong> {comparison.original}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {tailoredResume.skills && (
                  <div className="resume-section">
                    <h2>Additional Information</h2>
                    <p><strong>Technical & Software:</strong> {tailoredResume.skills}</p>
                  </div>
                )}
              </div>

              <div className="button-group">
                <button onClick={handleDownload} className="button">
                  Download Tailored Resume
                </button>
                <button onClick={() => { setTailoredResume(null); setJobDescription(''); }} className="button button-secondary">
                  Tailor for Another Job
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

export default Stage2Tailor
