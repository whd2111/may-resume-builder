import { useState } from 'react'
import { callClaude } from '../utils/claudeApi'

const REVIEWER_SYSTEM_PROMPT = `You are an expert resume reviewer with years of experience in recruiting and career coaching. Your job is to analyze resumes and provide detailed, actionable feedback.

EVALUATION CRITERIA:
1. LENGTH: **CRITICAL** - Resume MUST fit on ONE PAGE. Estimate total content and flag if it appears to exceed 1 page. This is the #1 most important issue.
1. ACTION VERBS: Check if bullets start with strong action verbs (led, built, drove, managed, designed, etc.)
2. METRICS: Verify that accomplishments include quantifiable results
3. CONCISENESS: Ensure bullets are max 2 lines and clearly written
4. IMPACT: Check if bullets follow "did X by Y as shown by Z" framework
5. CLARITY: Look for vague statements and suggest specific improvements
6. FORMATTING: Check for consistency in dates, formatting, style

SCORING:
- Rate each section (Contact Info, Education, Experience, Skills) on a scale of 1-10
- Provide an overall score
- Be constructive but honest

OUTPUT FORMAT:
Provide your review in this structure:

## Overall Score: X/10

## Section Scores:
- Contact Information: X/10
- Education: X/10
- Experience: X/10
- Skills: X/10

## Strengths:
[List 3-5 things done well]

## Areas for Improvement:

### Critical Issues:
[Issues that hurt the resume significantly]

### Suggested Improvements:
[Specific, actionable suggestions with examples]

## Specific Bullet Feedback:
[Go through experience bullets one by one and provide feedback]

Be direct, specific, and provide examples of how to improve weak bullets.`;

function ResumeReviewer({ apiKey, masterResume, onBack }) {
  const [review, setReview] = useState(null)
  const [isReviewing, setIsReviewing] = useState(false)
  const [error, setError] = useState('')

  const handleReview = async () => {
    if (!masterResume) {
      setError('No resume found. Please build a resume first.')
      return
    }

    setIsReviewing(true)
    setError('')

    try {
      // Format resume data for review
      const resumeText = formatResumeForReview(masterResume)

      const response = await callClaude(
        apiKey,
        [{ role: 'user', content: `Please review this resume and provide detailed feedback:\n\n${resumeText}` }],
        REVIEWER_SYSTEM_PROMPT
      )

      setReview(response)
    } catch (err) {
      setError(`Error reviewing resume: ${err.message}`)
    } finally {
      setIsReviewing(false)
    }
  }

  const formatResumeForReview = (resume) => {
    let text = `NAME: ${resume.name}\n\n`

    text += `CONTACT:\n`
    text += `Phone: ${resume.contact.phone}\n`
    text += `Email: ${resume.contact.email}\n`
    if (resume.contact.linkedin) {
      text += `LinkedIn: ${resume.contact.linkedin}\n`
    }
    text += `\n`

    if (resume.education && resume.education.length > 0) {
      text += `EDUCATION:\n`
      resume.education.forEach(edu => {
        text += `${edu.degree} - ${edu.institution}, ${edu.location} (${edu.dates})\n`
        if (edu.details) text += `${edu.details}\n`
      })
      text += `\n`
    }

    if (resume.experience && resume.experience.length > 0) {
      text += `EXPERIENCE:\n`
      resume.experience.forEach(exp => {
        text += `\n${exp.title} - ${exp.company}, ${exp.location} (${exp.dates})\n`
        exp.bullets.forEach(bullet => {
          text += `• ${bullet}\n`
        })
      })
      text += `\n`
    }

    if (resume.skills) {
      text += `SKILLS:\n${resume.skills}\n\n`
    }

    if (resume.additional) {
      text += `ADDITIONAL:\n${resume.additional}\n`
    }

    return text
  }

  if (!masterResume) {
    return (
      <div className="container">
        <div className="page-header">
          <button className="back-button" onClick={onBack}>
            ← Back to Home
          </button>
          <h1 className="page-title">Review Resume</h1>
          <p className="page-subtitle">Get AI-powered feedback on your resume</p>
        </div>

        <div className="card">
          <div className="info-box" style={{ borderColor: '#ff6b6b', background: '#ffe0e0' }}>
            <div className="info-box-text" style={{ color: '#c92a2a' }}>
              No resume found. Please build a resume first before reviewing.
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
        <h1 className="page-title">Review Resume</h1>
        <p className="page-subtitle">Get expert AI feedback on your resume quality</p>
      </div>

      {!review && !isReviewing && (
        <div className="card">
          <div className="card-title">Ready to Review</div>
          <p style={{ marginBottom: 'var(--space-lg)', color: 'var(--text-secondary)' }}>
            May will analyze your resume for:
          </p>
          <ul style={{ marginBottom: 'var(--space-lg)', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
            <li>Strong action verbs and impactful language</li>
            <li>Quantifiable metrics and results</li>
            <li>Bullet length and clarity</li>
            <li>Overall formatting and consistency</li>
            <li>Specific suggestions for improvement</li>
          </ul>

          {error && (
            <div className="info-box" style={{ borderColor: '#ff6b6b', background: '#ffe0e0', marginBottom: 'var(--space-lg)' }}>
              <div className="info-box-text" style={{ color: '#c92a2a' }}>
                {error}
              </div>
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleReview}
            style={{ width: '100%' }}
          >
            Review My Resume
          </button>
        </div>
      )}

      {isReviewing && (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="loading" style={{ width: '60px', height: '60px', margin: '0 auto 20px' }}></div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '18px' }}>
            Analyzing your resume...
          </p>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '14px', marginTop: '10px' }}>
            This may take 30-60 seconds
          </p>
        </div>
      )}

      {review && (
        <div className="card">
          <div className="card-title">Resume Review</div>
          <div style={{
            whiteSpace: 'pre-wrap',
            lineHeight: '1.8',
            color: 'var(--text-primary)'
          }}>
            {review}
          </div>
          <div className="button-group" style={{ marginTop: 'var(--space-xl)' }}>
            <button className="btn btn-secondary" onClick={onBack}>
              Back to Home
            </button>
            <button className="btn btn-primary" onClick={handleReview}>
              Review Again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ResumeReviewer
