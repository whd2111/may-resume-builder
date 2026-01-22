import { useState } from 'react'
import { callClaude } from '../utils/claudeApi'
import { ArrowLeftIcon, SearchIcon, WritingIcon } from '../utils/icons'

// Parse review into structured sections
const parseReview = (reviewText) => {
  const sections = {
    overallScore: null,
    sectionScores: [],
    strengths: [],
    criticalIssues: [],
    suggestions: [],
    bulletFeedback: []
  }

  const lines = reviewText.split('\n')
  let currentSection = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Overall score
    if (line.includes('Overall Score:')) {
      const match = line.match(/(\d+)\/10/)
      if (match) sections.overallScore = parseInt(match[1])
    }

    // Section scores
    if (line.includes('Contact Information:') || line.includes('Education:') || 
        line.includes('Experience:') || line.includes('Skills:')) {
      const match = line.match(/(.*?):\s*(\d+)\/10/)
      if (match) {
        sections.sectionScores.push({
          name: match[1].replace('- ', '').trim(),
          score: parseInt(match[2])
        })
      }
    }

    // Detect sections
    if (line.includes('## Strengths')) currentSection = 'strengths'
    else if (line.includes('### Critical Issues')) currentSection = 'critical'
    else if (line.includes('### Suggested Improvements')) currentSection = 'suggestions'
    else if (line.includes('## Specific Bullet Feedback')) currentSection = 'bullets'
    else if (line.startsWith('##')) currentSection = null

    // Parse content
    if (currentSection && line.startsWith('-') || line.match(/^\d+\./)) {
      const content = line.replace(/^-\s*/, '').replace(/^\d+\.\s*/, '')
      if (content) {
        if (currentSection === 'strengths') sections.strengths.push(content)
        else if (currentSection === 'critical') sections.criticalIssues.push(content)
        else if (currentSection === 'suggestions') sections.suggestions.push(content)
        else if (currentSection === 'bullets') sections.bulletFeedback.push(content)
      }
    }
  }

  return sections
}

// Score color helper
const getScoreColor = (score) => {
  if (score >= 8) return { bg: '#ECFDF5', text: '#065F46', accent: '#10B981' }
  if (score >= 6) return { bg: '#FEF3C7', text: '#92400E', accent: '#F59E0B' }
  if (score >= 4) return { bg: '#FED7AA', text: '#9A3412', accent: '#F97316' }
  return { bg: '#FEE2E2', text: '#991B1B', accent: '#EF4444' }
}

// ... existing prompts ...

// Review Display Component
function ReviewDisplay({ review, onBack, onRefresh }) {
  const [expandedSections, setExpandedSections] = useState({
    scores: true,
    strengths: true,
    critical: true,
    suggestions: true,
    bullets: false
  })

  const parsed = parseReview(review)
  const overallColor = getScoreColor(parsed.overallScore || 0)

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  return (
    <div className="stagger-1" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      {/* Overall Score - Hero Card */}
      <div className="card-premium score-badge" style={{ 
        background: overallColor.bg,
        borderLeft: `4px solid ${overallColor.accent}`,
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle animated background gradient */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '200%',
          height: '100%',
          background: `linear-gradient(90deg, transparent, ${overallColor.accent}22, transparent)`,
          animation: 'shimmer 3s infinite',
          pointerEvents: 'none'
        }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '56px', fontWeight: '800', color: overallColor.text, marginBottom: 'var(--space-sm)', letterSpacing: '-0.02em' }}>
            {parsed.overallScore || 'N/A'}<span style={{ fontSize: '32px', opacity: 0.6 }}>/10</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '600', color: overallColor.text, marginBottom: 'var(--space-md)' }}>
            Overall Resume Score
          </div>
          
          {/* Score progress bar */}
          <div style={{ 
            width: '100%', 
            height: '6px', 
            background: 'rgba(0,0,0,0.1)', 
            borderRadius: '999px',
            overflow: 'hidden',
            marginTop: 'var(--space-lg)'
          }}>
            <div style={{ 
              width: `${(parsed.overallScore || 0) * 10}%`, 
              height: '100%', 
              background: overallColor.accent,
              borderRadius: '999px',
              transition: 'width 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
              animation: 'slideRight 1s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }} />
          </div>
        </div>
      </div>

      {/* Section Scores Grid */}
      {parsed.sectionScores.length > 0 && (
        <div className="card-premium">
          <button 
            onClick={() => toggleSection('scores')}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              padding: 0,
              marginBottom: expandedSections.scores ? 'var(--space-lg)' : 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div className="card-title" style={{ marginBottom: 0 }}>
              <SearchIcon />
              Section Breakdown
            </div>
            <span style={{ fontSize: '20px', color: 'var(--text-tertiary)', transform: expandedSections.scores ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s' }}>
              ▼
            </span>
          </button>
          
          {expandedSections.scores && (
            <div className="collapsible-content" style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: 'var(--space-md)' 
            }}>
              {parsed.sectionScores.map((section, idx) => {
                const color = getScoreColor(section.score)
                return (
                  <div key={idx} style={{
                    background: color.bg,
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-lg)',
                    borderLeft: `3px solid ${color.accent}`,
                    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                    cursor: 'default',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = `0 8px 20px ${color.accent}40`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                  >
                    <div style={{ fontSize: '36px', fontWeight: '700', color: color.text, marginBottom: 'var(--space-xs)' }}>
                      {section.score}<span style={{ fontSize: '20px', opacity: 0.6 }}>/10</span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: color.text, marginBottom: 'var(--space-sm)' }}>
                      {section.name}
                    </div>
                    
                    {/* Mini progress bar */}
                    <div style={{ 
                      width: '100%', 
                      height: '4px', 
                      background: 'rgba(0,0,0,0.1)', 
                      borderRadius: '999px',
                      overflow: 'hidden'
                    }}>
                      <div style={{ 
                        width: `${section.score * 10}%`, 
                        height: '100%', 
                        background: color.accent,
                        borderRadius: '999px',
                        transition: 'width 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        transitionDelay: `${idx * 0.1}s`
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Strengths */}
      {parsed.strengths.length > 0 && (
        <div className="card-premium" style={{ borderLeft: '4px solid #10B981' }}>
          <button 
            onClick={() => toggleSection('strengths')}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              padding: 0,
              marginBottom: expandedSections.strengths ? 'var(--space-lg)' : 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div className="card-title" style={{ marginBottom: 0, color: '#065F46' }}>
              ✓ Strengths
            </div>
            <span style={{ fontSize: '20px', color: 'var(--text-tertiary)', transform: expandedSections.strengths ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s' }}>
              ▼
            </span>
          </button>
          
          {expandedSections.strengths && (
            <ul className="collapsible-content" style={{ 
              listStyle: 'none', 
              padding: 0, 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 'var(--space-md)' 
            }}>
              {parsed.strengths.map((strength, idx) => (
                <li key={idx} style={{
                  background: '#ECFDF5',
                  padding: 'var(--space-md)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#065F46',
                  fontSize: '15px',
                  lineHeight: '1.6',
                  display: 'flex',
                  gap: 'var(--space-sm)'
                }}>
                  <span style={{ flexShrink: 0 }}>✓</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Critical Issues */}
      {parsed.criticalIssues.length > 0 && (
        <div className="card-premium" style={{ borderLeft: '4px solid #EF4444' }}>
          <button 
            onClick={() => toggleSection('critical')}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              padding: 0,
              marginBottom: expandedSections.critical ? 'var(--space-lg)' : 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div className="card-title" style={{ marginBottom: 0, color: '#991B1B' }}>
              ⚠ Critical Issues
            </div>
            <span style={{ fontSize: '20px', color: 'var(--text-tertiary)', transform: expandedSections.critical ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s' }}>
              ▼
            </span>
          </button>
          
          {expandedSections.critical && (
            <ul className="collapsible-content" style={{ 
              listStyle: 'none', 
              padding: 0, 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 'var(--space-md)' 
            }}>
              {parsed.criticalIssues.map((issue, idx) => (
                <li key={idx} style={{
                  background: '#FEE2E2',
                  padding: 'var(--space-md)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#991B1B',
                  fontSize: '15px',
                  lineHeight: '1.6',
                  display: 'flex',
                  gap: 'var(--space-sm)'
                }}>
                  <span style={{ flexShrink: 0 }}>⚠</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Suggestions */}
      {parsed.suggestions.length > 0 && (
        <div className="card-premium" style={{ borderLeft: '4px solid #F59E0B' }}>
          <button 
            onClick={() => toggleSection('suggestions')}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              padding: 0,
              marginBottom: expandedSections.suggestions ? 'var(--space-lg)' : 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div className="card-title" style={{ marginBottom: 0, color: '#92400E' }}>
              💡 Suggestions
            </div>
            <span style={{ fontSize: '20px', color: 'var(--text-tertiary)', transform: expandedSections.suggestions ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s' }}>
              ▼
            </span>
          </button>
          
          {expandedSections.suggestions && (
            <ul className="collapsible-content" style={{ 
              listStyle: 'none', 
              padding: 0, 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 'var(--space-md)' 
            }}>
              {parsed.suggestions.map((suggestion, idx) => (
                <li key={idx} style={{
                  background: '#FEF3C7',
                  padding: 'var(--space-md)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#92400E',
                  fontSize: '15px',
                  lineHeight: '1.6',
                  display: 'flex',
                  gap: 'var(--space-sm)'
                }}>
                  <span style={{ flexShrink: 0 }}>💡</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Bullet Feedback */}
      {parsed.bulletFeedback.length > 0 && (
        <div className="card-premium">
          <button 
            onClick={() => toggleSection('bullets')}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              padding: 0,
              marginBottom: expandedSections.bullets ? 'var(--space-lg)' : 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div className="card-title" style={{ marginBottom: 0 }}>
              <WritingIcon />
              Detailed Bullet Feedback
            </div>
            <span style={{ fontSize: '20px', color: 'var(--text-tertiary)', transform: expandedSections.bullets ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s' }}>
              ▼
            </span>
          </button>
          
          {expandedSections.bullets && (
            <div className="collapsible-content" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 'var(--space-sm)',
              fontSize: '14px',
              lineHeight: '1.7',
              color: 'var(--text-secondary)'
            }}>
              {parsed.bulletFeedback.map((feedback, idx) => (
                <div key={idx} style={{
                  padding: 'var(--space-md)',
                  background: 'rgba(0,0,0,0.02)',
                  borderRadius: 'var(--radius-sm)',
                  borderLeft: '2px solid var(--accent-primary)'
                }}>
                  {feedback}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="button-group">
        <button className="btn btn-secondary" onClick={onBack}>
          <ArrowLeftIcon />
          Back to Home
        </button>
        <button className="btn btn-primary" onClick={onRefresh}>
          <WritingIcon />
          Refresh Review
        </button>
      </div>
    </div>
  )
}

const REVIEWER_SYSTEM_PROMPT = `You are an expert resume reviewer with years of experience in recruiting and career coaching. Your job is to analyze resumes and provide detailed, actionable feedback.

EVALUATION CRITERIA:
1. **PLACEHOLDERS** - CRITICAL: Check for any placeholder text like [ADD NUMBER], [ADD %], [ADD OUTCOME], [ADD SCOPE], [ADD POPULATION SIZE], etc. These MUST be filled in with actual data.
2. **LENGTH** - CRITICAL: Resume MUST fit on ONE PAGE. Estimate total content and flag if it appears to exceed 1 page. This is essential.
3. **TENSE CONSISTENCY** - CRITICAL: All bullets for past positions MUST use past tense (led, built, drove, managed, designed). Current positions can use present tense. Flag any inconsistencies.
4. **LINE FILLING** - Check if bullets are too short and leave excessive white space. Good bullets should fill 1-2 lines, not leave half-empty lines that make the resume look sparse.
5. **ACTION VERBS**: Check if bullets start with strong action verbs
6. **METRICS**: Verify that accomplishments include quantifiable results
7. **CONCISENESS**: Ensure bullets are max 2 lines and clearly written
8. **IMPACT**: Check if bullets follow "did X by Y as shown by Z" framework
9. **CLARITY**: Look for vague statements and suggest specific improvements
10. **FORMATTING**: Check for consistency in dates, formatting, style

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
[MUST flag these if found:
 - Any placeholder text like [ADD NUMBER] or similar
 - Resume exceeding 1 page
 - Tense inconsistencies (mixing past/present for completed work)
 - Issues that hurt the resume significantly]

### Suggested Improvements:
[Specific, actionable suggestions with examples:
 - Short bullets that should be expanded to fill the line better
 - Vague statements that need specifics
 - Other improvements]

## Specific Bullet Feedback:
[Go through experience bullets one by one and provide feedback]

Be direct, specific, and provide examples of how to improve weak bullets.`;

function ResumeReviewer({ primaryResume, onBack, onNavigate }) {
  const [review, setReview] = useState(null)
  const [isReviewing, setIsReviewing] = useState(false)
  const [error, setError] = useState('')

  const handleReview = async () => {
    if (!primaryResume) {
      setError('No resume found. Please build a resume first.')
      return
    }

    setIsReviewing(true)
    setError('')

    try {
      // Format resume data for review
      const resumeText = formatResumeForReview(primaryResume)

      const response = await callClaude(
        null,
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
          <h1 className="page-title">Resume Review</h1>
          <p className="page-subtitle">Get expert AI feedback on your resume quality</p>
        </div>

        <div className="card-premium" style={{ borderLeft: '4px solid #ef4444' }}>
          <p style={{ color: '#b91c1c', fontWeight: '500' }}>
            No resume found. Please build one first to enable review.
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
            Back to Home
          </button>
        )}
        <div className="logo" style={{ fontSize: '24px', margin: 0 }}>May</div>
      </nav>

      <div className="page-header">
        <h1 className="page-title">Resume Review</h1>
        <p className="page-subtitle">Get expert AI feedback on your resume quality</p>
      </div>

      {!review && !isReviewing && (
        <div className="card-premium stagger-1">
          <div className="card-title">
            <SearchIcon />
            Ready for Analysis
          </div>
          <p style={{ marginBottom: 'var(--space-lg)', color: 'var(--text-secondary)', fontSize: '15px' }}>
            May will perform a deep scan of your resume, evaluating it against industry best practices.
          </p>
          <ul style={{ marginBottom: 'var(--space-xl)', color: 'var(--text-secondary)', lineHeight: '1.8', paddingLeft: '20px' }}>
            <li>Strong action verbs and impactful language</li>
            <li>Quantifiable metrics and results</li>
            <li>Bullet length and clarity</li>
            <li>Overall formatting and consistency</li>
            <li>Specific suggestions for improvement</li>
          </ul>

          {error && (
            <div className="card" style={{ borderLeft: '4px solid #ef4444', background: '#fef2f2', marginBottom: 'var(--space-lg)' }}>
              <p style={{ color: '#b91c1c', fontSize: '14px' }}>{error}</p>
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleReview}
            style={{ width: '100%' }}
          >
            <WritingIcon />
            Review My Resume
          </button>
        </div>
      )}

      {isReviewing && (
        <div style={{ textAlign: 'center', padding: 'var(--space-3xl) var(--space-xl)' }}>
          <div className="action-card-icon" style={{ margin: '0 auto var(--space-xl)', background: 'var(--gradient-primary)', color: 'white' }}>
            <SearchIcon />
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '20px', fontWeight: '500' }}>
            Analyzing your resume...
          </p>
          <div className="loading" style={{ marginTop: 'var(--space-lg)' }}></div>
        </div>
      )}

      {review && <ReviewDisplay review={review} onBack={onBack} onRefresh={handleReview} />}
    </div>
  )
}

export default ResumeReviewer
