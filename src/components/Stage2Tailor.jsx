import { useState } from 'react'
import { callClaude } from '../utils/claudeApi'
import { generateDOCX } from '../utils/docxGenerator'

const TAILORING_PROMPT = `You are May, an expert resume tailoring assistant. You have the user's master resume and a job description. Your task is to tailor the resume bullets to align with the job requirements while maintaining truthfulness.

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

function Stage2Tailor({ apiKey, masterResume, onBack }) {
  const [jobDescription, setJobDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [tailoredResume, setTailoredResume] = useState(null)
  const [explanation, setExplanation] = useState('')

  const handleTailor = async (e) => {
    e.preventDefault()
    if (!jobDescription.trim()) return

    setIsLoading(true)
    setTailoredResume(null)
    setExplanation('')

    try {
      const prompt = `Here is the master resume data:
${JSON.stringify(masterResume, null, 2)}

Here is the job description:
${jobDescription}

Please tailor this resume for the job description.`

      const response = await callClaude(apiKey, [{ role: 'user', content: prompt }], TAILORING_PROMPT)

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

  const handleDownloadMaster = async () => {
    try {
      await generateDOCX(masterResume, 'master_resume.docx')
      alert('Master resume downloaded successfully!')
    } catch (error) {
      alert(`Error generating document: ${error.message}`)
    }
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
            : "You need to build a master resume first before tailoring"}
        </p>
      </div>

      {!masterResume && (
        <div className="info-box" style={{ borderColor: '#ff6b6b', background: '#ffe0e0' }}>
          <div className="info-box-text" style={{ color: '#c92a2a' }}>
            No master resume found. Please build a resume first using the "Build a Resume" option.
          </div>
        </div>
      )}

      {masterResume && (
        <>

      <form onSubmit={handleTailor}>
        <div className="input-group">
          <label htmlFor="jobDescription">Job Description</label>
          <textarea
            id="jobDescription"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the full job description here..."
            required
            rows={10}
          />
        </div>

        <button type="submit" className="button" disabled={isLoading || !jobDescription.trim()}>
          {isLoading ? 'Tailoring Resume...' : 'Tailor Resume'}
        </button>
      </form>

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
                {tailoredResume.experience.map((exp, idx) => (
                  <div key={idx} className="resume-item">
                    <div className="resume-item-header">
                      <span><strong>{exp.company}</strong></span>
                      <span>{exp.location}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                      <span><em>{exp.title}</em></span>
                      <span>{exp.dates}</span>
                    </div>
                    {exp.bullets && exp.bullets.length > 0 && (
                      <ul>
                        {exp.bullets.map((bullet, bidx) => (
                          <li key={bidx}>{bullet}</li>
                        ))}
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
