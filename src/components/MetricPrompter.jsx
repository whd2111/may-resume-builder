import { useState, useEffect } from 'react'
import { callClaude } from '../utils/claudeApi'

const METRIC_PROMPTER_SYSTEM = `You are a helpful assistant that generates specific, targeted questions to help extract quantifiable metrics from resume accomplishments.

When given a bullet point with [ADD METRIC], generate 1-2 short, specific questions that would help the user provide the missing metric.

GUIDELINES:
- Questions should be concrete and easy to answer with a number
- Focus on quantifiable outcomes (how many, how much, by what %, etc.)
- Keep questions short (one sentence each)
- Ask about impact, scale, or results

EXAMPLES:
Bullet: "Supported voter contact campaigns [ADD METRIC]"
Questions:
1. How many voter contact campaigns did you support?
2. What was the total reach or number of voters contacted?

Bullet: "Improved customer satisfaction [ADD METRIC]"
Questions:
1. By what percentage did customer satisfaction increase?
2. How was this measured (survey score, NPS, etc.)?

Return ONLY the questions as a numbered list, no additional text.`

function MetricPrompter({ resumeData, onComplete, onSkip }) {
  const [metrics, setMetrics] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(true)
  const [userAnswers, setUserAnswers] = useState({})
  const [error, setError] = useState('')

  // Find all [ADD METRIC] placeholders in the resume
  useEffect(() => {
    const findMetrics = () => {
      const found = []

      resumeData.experience?.forEach((exp, expIdx) => {
        exp.bullets?.forEach((bullet, bulletIdx) => {
          if (bullet.includes('[ADD METRIC]')) {
            found.push({
              type: 'experience',
              expIdx,
              bulletIdx,
              bullet,
              company: exp.company,
              title: exp.title
            })
          }
        })
      })

      return found
    }

    const foundMetrics = findMetrics()

    if (foundMetrics.length === 0) {
      // No metrics to add, skip this step
      onComplete(resumeData)
      return
    }

    setMetrics(foundMetrics)

    // Generate questions for all metrics
    const generateAllQuestions = async () => {
      try {
        const metricsWithQuestions = []

        for (const metric of foundMetrics) {
          const prompt = `Generate specific questions to help extract the missing metric from this bullet point:\n\n"${metric.bullet}"\n\nContext: This is from their role as ${metric.title} at ${metric.company}.`

          const response = await callClaude(
            null,
            [{ role: 'user', content: prompt }],
            METRIC_PROMPTER_SYSTEM
          )

          metricsWithQuestions.push({
            ...metric,
            questions: response.trim()
          })
        }

        setMetrics(metricsWithQuestions)
        setIsGeneratingQuestions(false)
      } catch (err) {
        setError(`Error generating questions: ${err.message}`)
        setIsGeneratingQuestions(false)
      }
    }

    generateAllQuestions()
  }, [])

  const handleAnswerChange = (e) => {
    setUserAnswers({
      ...userAnswers,
      [currentIndex]: e.target.value
    })
  }

  const handleNext = () => {
    if (currentIndex < metrics.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // All questions answered, apply the metrics
      applyMetrics()
    }
  }

  const handleSkipThis = () => {
    if (currentIndex < metrics.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // Last question, apply whatever we have
      applyMetrics()
    }
  }

  const applyMetrics = () => {
    // Create a new resume data object with metrics filled in
    const updatedResume = JSON.parse(JSON.stringify(resumeData))

    metrics.forEach((metric, idx) => {
      const answer = userAnswers[idx]
      if (answer && answer.trim()) {
        // Replace [ADD METRIC] with the user's answer
        const originalBullet = metric.bullet
        const updatedBullet = originalBullet.replace('[ADD METRIC]', answer.trim())

        if (metric.type === 'experience') {
          updatedResume.experience[metric.expIdx].bullets[metric.bulletIdx] = updatedBullet
        }
      }
    })

    onComplete(updatedResume)
  }

  if (metrics.length === 0) {
    return null // Component won't render if no metrics found
  }

  if (isGeneratingQuestions) {
    return (
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Enhancing Your Resume</h1>
          <p className="page-subtitle">Preparing personalized questions to help you add metrics...</p>
        </div>

        <div className="card">
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div className="loading" style={{ width: '60px', height: '60px', margin: '0 auto 20px' }}></div>
            <p style={{ color: 'var(--text-secondary)' }}>
              Found {metrics.length} place{metrics.length === 1 ? '' : 's'} where you can add metrics
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Add Metrics</h1>
        </div>

        <div className="card">
          <div className="info-box" style={{ borderColor: '#ff6b6b', background: '#ffe0e0' }}>
            <div className="info-box-text" style={{ color: '#c92a2a' }}>
              {error}
            </div>
          </div>

          <button className="btn btn-secondary" onClick={() => onComplete(resumeData)} style={{ marginTop: 'var(--space-md)' }}>
            Skip and Continue
          </button>
        </div>
      </div>
    )
  }

  const currentMetric = metrics[currentIndex]

  return (
    <div className="container" style={{ maxWidth: '700px' }}>
      <div className="page-header">
        <h1 className="page-title">Add Metrics to Strengthen Your Resume</h1>
        <p className="page-subtitle">
          Question {currentIndex + 1} of {metrics.length}
        </p>
      </div>

      <div className="card">
        <div className="info-box" style={{ marginBottom: 'var(--space-lg)', borderColor: '#3b82f6', background: '#eff6ff' }}>
          <div className="info-box-title" style={{ color: '#1e40af' }}>
            💼 {currentMetric.title} at {currentMetric.company}
          </div>
          <div className="info-box-text" style={{ color: '#1e3a8a', fontStyle: 'italic', marginTop: '8px' }}>
            "{currentMetric.bullet.replace('[ADD METRIC]', '___')}"
          </div>
        </div>

        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <div style={{
            fontSize: '15px',
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-md)',
            lineHeight: '1.6',
            whiteSpace: 'pre-line'
          }}>
            {currentMetric.questions}
          </div>
        </div>

        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '8px',
            color: 'var(--text-primary)'
          }}>
            Your answer:
          </label>
          <input
            type="text"
            value={userAnswers[currentIndex] || ''}
            onChange={handleAnswerChange}
            placeholder="e.g., '15 campaigns reaching 50,000+ voters' or 'by 23% (from 3.2 to 3.9 out of 5)'"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '2px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'inherit'
            }}
            autoFocus
          />
        </div>

        <div style={{
          display: 'flex',
          gap: 'var(--space-md)',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            className="btn btn-secondary"
            onClick={handleSkipThis}
            style={{ flex: '0 0 auto' }}
          >
            {currentIndex < metrics.length - 1 ? 'Skip This One' : 'Skip & Finish'}
          </button>

          <div style={{ flex: '1', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>
            Progress: {currentIndex + 1}/{metrics.length}
          </div>

          <button
            className="btn btn-primary"
            onClick={handleNext}
            disabled={!userAnswers[currentIndex]?.trim()}
            style={{ flex: '0 0 auto' }}
          >
            {currentIndex < metrics.length - 1 ? 'Next Question' : 'Finish & Apply Metrics'}
          </button>
        </div>
      </div>

      <div className="info-box">
        <div className="info-box-title">💡 Tips for great metrics:</div>
        <div className="info-box-text">
          • Be specific with numbers (15 campaigns, not "multiple campaigns")
          <br />
          • Include context (50,000+ voters, $2M budget, 23% increase)
          <br />
          • Show impact when possible (improved X by Y%, saved $Z)
        </div>
      </div>
    </div>
  )
}

export default MetricPrompter
