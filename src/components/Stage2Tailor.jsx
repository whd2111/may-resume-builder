import { useState } from 'react'
import { callClaude } from '../utils/claudeApi'
import { generateDOCX } from '../utils/docxGenerator'
import { ArrowLeftIcon, TargetIcon, WritingIcon, DownloadIcon } from '../utils/icons'

// ... existing prompts ...

const SUGGESTIONS_PROMPT = `You are May, an expert resume tailoring assistant. You have the user's primary 1-page resume and a job description. Your task is to suggest specific changes to align the resume with the job requirements while maintaining truthfulness.

ANALYSIS RULES:
1. Analyze the job description for key skills, requirements, and keywords
2. Identify the TOP 10 most impactful changes to make the resume stand out for this role
3. For each suggestion, explain WHY it matches the JD and assess the RISK of the change
4. NEVER fabricate experience - only reframe and emphasize existing accomplishments
5. Maintain the "did X by Y as shown by Z" framework where possible
6. Prioritize changes that have high impact and low risk

Respond with a JSON object in this EXACT format:
{
  "action": "tailoring_suggestions",
  "suggestions": [
    {
      "id": "1",
      "type": "bullet_change",
      "location": "Experience 1, Bullet 2",
      "original": "Original bullet text",
      "proposed": "Proposed new bullet text",
      "impact": "high|medium|low",
      "why": "Explanation of why this matches the job description (2-3 sentences)",
      "risk": "low|medium|high",
      "riskReason": "Brief explanation of any truthfulness concerns"
    }
  ]
}

Include exactly 10 suggestions, ordered by impact (highest first).`;

const FINAL_TAILORING_PROMPT = `You are May, an expert resume tailoring assistant. You have the user's primary resume and a set of ACCEPTED changes. Apply ONLY the accepted changes to create the final tailored resume.

RULES:
1. Apply each accepted change exactly as specified
2. Keep all other content unchanged from the original resume
3. Ensure proper formatting and consistency
4. Maintain the resume structure

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
        "bullets": ["...", "..."]
      }
    ],
    "skills": "...",
    "additional": "..."
  },
  "explanation": "Brief summary of changes applied"
}`;

function Stage2Tailor({ primaryResume, onBack }) {
  const [jobDescription, setJobDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState(null)
  const [acceptedSuggestions, setAcceptedSuggestions] = useState({})
  const [tailoredResume, setTailoredResume] = useState(null)
  const [explanation, setExplanation] = useState('')
  const [showComparison, setShowComparison] = useState(true)

  const handleAnalyze = async (e) => {
    e.preventDefault()
    if (!jobDescription.trim()) return

    setIsLoading(true)
    setSuggestions(null)
    setAcceptedSuggestions({})
    setTailoredResume(null)

    try {
      const prompt = `Here is the primary 1-page resume data:
${JSON.stringify(primaryResume, null, 2)}

Here is the job description:
${jobDescription}

Please analyze and provide your top 10 tailoring suggestions.`

      const response = await callClaude(null, [{ role: 'user', content: prompt }], SUGGESTIONS_PROMPT)

      // Parse the response
      const jsonMatch = response.match(/\{[\s\S]*"action":\s*"tailoring_suggestions"[\s\S]*\}/)
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0])
        setSuggestions(result.suggestions || [])
        // Default all to accepted
        const defaultAccepted = {}
        result.suggestions.forEach(s => {
          defaultAccepted[s.id] = true
        })
        setAcceptedSuggestions(defaultAccepted)
      } else {
        throw new Error('Could not parse suggestions response')
      }
    } catch (error) {
      alert(`Error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateFinal = async () => {
    setIsLoading(true)
    setTailoredResume(null)

    try {
      const accepted = suggestions.filter(s => acceptedSuggestions[s.id])
      
      const prompt = `Here is the original resume:
${JSON.stringify(primaryResume, null, 2)}

Here are the accepted changes to apply:
${JSON.stringify(accepted, null, 2)}

Please generate the final tailored resume with ONLY these accepted changes applied.`

      const response = await callClaude(null, [{ role: 'user', content: prompt }], FINAL_TAILORING_PROMPT)

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

  const toggleSuggestion = (id) => {
    setAcceptedSuggestions(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const getImpactColor = (impact) => {
    switch(impact) {
      case 'high': return '#10b981'
      case 'medium': return '#f59e0b'
      case 'low': return '#6b7280'
      default: return '#6b7280'
    }
  }

  const getRiskColor = (risk) => {
    switch(risk) {
      case 'low': return '#10b981'
      case 'medium': return '#f59e0b'
      case 'high': return '#ef4444'
      default: return '#6b7280'
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

      {!primaryResume && (
        <div className="card-premium" style={{ borderLeft: '4px solid #ef4444' }}>
          <p style={{ color: '#b91c1c', fontWeight: '500' }}>
            No primary resume found. Please build one first to enable tailoring.
          </p>
          <button className="btn btn-primary" onClick={onBack} style={{ marginTop: 'var(--space-md)' }}>
            Go to Resume Builder
          </button>
        </div>
      )}

      {primaryResume && (
        <>
          {!suggestions && !tailoredResume && !isLoading && (
            <div className="card-premium">
              <div className="card-title">
                <TargetIcon />
                Job Description
              </div>
              <p style={{ marginBottom: 'var(--space-lg)', color: 'var(--text-secondary)', fontSize: '15px' }}>
                Paste the full job posting below. May will analyze key skills and reframe your accomplishments to stand out to recruiters.
              </p>

              <form onSubmit={handleAnalyze}>
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
                  <TargetIcon />
                  Analyze Job & Get Suggestions
                </button>
              </form>
            </div>
          )}

          {isLoading && !suggestions && (
            <div style={{ textAlign: 'center', padding: 'var(--space-3xl) var(--space-xl)' }}>
              <div className="action-card-icon" style={{ margin: '0 auto var(--space-xl)', background: 'var(--gradient-primary)', color: 'white' }}>
                <TargetIcon />
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '20px', fontWeight: '500' }}>
                Analyzing job description and generating suggestions...
              </p>
              <div className="loading" style={{ marginTop: 'var(--space-lg)' }}></div>
            </div>
          )}

          {isLoading && suggestions && (
            <div style={{ textAlign: 'center', padding: 'var(--space-3xl) var(--space-xl)' }}>
              <div className="action-card-icon" style={{ margin: '0 auto var(--space-xl)', background: 'var(--gradient-primary)', color: 'white' }}>
                <WritingIcon />
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '20px', fontWeight: '500' }}>
                Generating tailored resume from accepted suggestions...
              </p>
              <div className="loading" style={{ marginTop: 'var(--space-lg)' }}></div>
            </div>
          )}

          {suggestions && !tailoredResume && !isLoading && (
            <div className="stagger-1">
              <div className="card-premium" style={{ borderLeft: '4px solid #3b82f6', background: '#eff6ff' }}>
                <div className="card-title" style={{ color: '#1e40af' }}>
                  <TargetIcon />
                  {suggestions.length} Tailoring Suggestions
                </div>
                <p style={{ color: '#1e40af', fontSize: '15px', lineHeight: '1.6', marginBottom: 'var(--space-md)' }}>
                  Review each suggestion below. Toggle off any changes you don't want, then generate your tailored resume.
                </p>
                <div style={{ fontSize: '14px', color: '#1e40af', opacity: 0.8 }}>
                  {Object.values(acceptedSuggestions).filter(Boolean).length} of {suggestions.length} suggestions accepted
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {suggestions.map((suggestion, idx) => (
                  <div 
                    key={suggestion.id}
                    className="card-premium"
                    style={{ 
                      opacity: acceptedSuggestions[suggestion.id] ? 1 : 0.6,
                      borderLeft: `4px solid ${acceptedSuggestions[suggestion.id] ? '#10b981' : '#e5e7eb'}`,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
                          <span style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text-primary)' }}>
                            Suggestion {idx + 1}
                          </span>
                          <span style={{ 
                            fontSize: '11px', 
                            fontWeight: '600',
                            padding: '2px 8px', 
                            borderRadius: '8px',
                            background: `${getImpactColor(suggestion.impact)}20`,
                            color: getImpactColor(suggestion.impact),
                            textTransform: 'uppercase'
                          }}>
                            {suggestion.impact} impact
                          </span>
                          <span style={{ 
                            fontSize: '11px', 
                            fontWeight: '600',
                            padding: '2px 8px', 
                            borderRadius: '8px',
                            background: `${getRiskColor(suggestion.risk)}20`,
                            color: getRiskColor(suggestion.risk),
                            textTransform: 'uppercase'
                          }}>
                            {suggestion.risk} risk
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)' }}>
                          {suggestion.location}
                        </div>
                      </div>
                      
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        cursor: 'pointer',
                        padding: '8px 16px',
                        borderRadius: '12px',
                        background: acceptedSuggestions[suggestion.id] ? '#10b98120' : '#f3f4f6',
                        border: `2px solid ${acceptedSuggestions[suggestion.id] ? '#10b981' : '#e5e7eb'}`,
                        transition: 'all 0.2s ease'
                      }}>
                        <input
                          type="checkbox"
                          checked={acceptedSuggestions[suggestion.id]}
                          onChange={() => toggleSuggestion(suggestion.id)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <span style={{ 
                          fontSize: '14px', 
                          fontWeight: '600',
                          color: acceptedSuggestions[suggestion.id] ? '#10b981' : '#6b7280'
                        }}>
                          {acceptedSuggestions[suggestion.id] ? 'Accept' : 'Reject'}
                        </span>
                      </label>
                    </div>

                    <div style={{ marginBottom: 'var(--space-md)' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>Original:</div>
                      <div style={{ 
                        padding: 'var(--space-sm)', 
                        background: '#fef2f2', 
                        borderRadius: '8px',
                        fontSize: '14px',
                        lineHeight: '1.5',
                        borderLeft: '3px solid #ef4444'
                      }}>
                        {suggestion.original}
                      </div>
                    </div>

                    <div style={{ marginBottom: 'var(--space-md)' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>Proposed:</div>
                      <div style={{ 
                        padding: 'var(--space-sm)', 
                        background: '#f0fdf4', 
                        borderRadius: '8px',
                        fontSize: '14px',
                        lineHeight: '1.5',
                        borderLeft: '3px solid #10b981'
                      }}>
                        {suggestion.proposed}
                      </div>
                    </div>

                    <div style={{ marginBottom: 'var(--space-sm)' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>Why this matches:</div>
                      <div style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                        {suggestion.why}
                      </div>
                    </div>

                    {suggestion.risk !== 'low' && (
                      <div style={{ 
                        padding: 'var(--space-sm)', 
                        background: '#fef3c7', 
                        borderRadius: '8px',
                        fontSize: '13px',
                        color: '#92400e',
                        borderLeft: '3px solid #f59e0b'
                      }}>
                        <strong>Risk note:</strong> {suggestion.riskReason}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="button-group" style={{ marginTop: 'var(--space-xl)' }}>
                <button 
                  onClick={handleGenerateFinal} 
                  className="btn btn-primary"
                  disabled={Object.values(acceptedSuggestions).filter(Boolean).length === 0}
                  style={{ flex: 2 }}
                >
                  <WritingIcon />
                  Generate Tailored Resume ({Object.values(acceptedSuggestions).filter(Boolean).length} changes)
                </button>
                <button 
                  onClick={() => { setSuggestions(null); setJobDescription(''); }} 
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Start Over
                </button>
              </div>
            </div>
          )}

          {tailoredResume && (
            <div className="stagger-1">
              <div className="card-premium" style={{ borderLeft: '4px solid #10b981', background: '#f0fdf4' }}>
                <div className="card-title" style={{ color: '#065f46' }}>
                  <WritingIcon />
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
                  onClick={() => setTailoredResume(null)} 
                  className="btn btn-secondary"
                >
                  ← Back to Suggestions
                </button>
                <button 
                  onClick={() => { setTailoredResume(null); setSuggestions(null); setJobDescription(''); }} 
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
