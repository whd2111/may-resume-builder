import { useState, useEffect } from 'react'
import { callClaude } from '../utils/claudeApi'

const METRIC_BATCH_SYSTEM = `You are a strict data parser for a resume builder. 
I will give you a list of resume bullet points that contain a placeholder [ADD METRIC].
For EACH bullet point, generate a short, specific question to help the user quantify it.

Return ONLY a valid JSON array of strings. Do not include markdown formatting or explanations.
Example Input:
1. Managed a team [ADD METRIC]
2. Reduced costs [ADD METRIC]

Example Output:
["How many people were on the team?", "What was the percentage or dollar amount of savings?"]`

function MetricPrompter({ resumeData, onComplete, onSkip }) {
  const [opportunities, setOpportunities] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnalyzing, setIsAnalyzing] = useState(true)
  const [currentEditValue, setCurrentEditValue] = useState('')
  
  // 1. Mount: Find opportunities AND Batch Fetch Questions
  useEffect(() => {
    const init = async () => {
      // Step A: Find all bullets needing metrics
      const found = []
      resumeData.experience?.forEach((exp, expIdx) => {
        exp.bullets?.forEach((bullet, bulletIdx) => {
          if (bullet.includes('[ADD METRIC]')) {
            found.push({
              id: `${expIdx}-${bulletIdx}`,
              expIdx,
              bulletIdx,
              originalBullet: bullet,
              company: exp.company,
              title: exp.title,
              question: "Can you add a specific number, percentage, or dollar amount?" // Default fallback
            })
          }
        })
      })

      if (found.length === 0) {
        onComplete(resumeData)
        return
      }

      // Step B: The "Pre-Flight" Batch API Call
      try {
        // Construct a numbered list for the AI
        const bulletList = found.map((item, i) => `${i + 1}. "${item.originalBullet}" (Role: ${item.title})`).join('\n')
        
        const prompt = `Here are the bullet points:\n${bulletList}`
        
        // One call to rule them all
        const response = await callClaude(null, [{ role: 'user', content: prompt }], METRIC_BATCH_SYSTEM)
        
        // Parse the JSON array
        // We sanitize the response just in case Claude adds "Here is the JSON:" fluff
        const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim()
        const questions = JSON.parse(jsonStr)

        // Merge questions into our opportunities
        if (Array.isArray(questions) && questions.length === found.length) {
          questions.forEach((q, i) => {
            found[i].question = q
          })
        }
      } catch (err) {
        console.error("Batch AI failed, using defaults", err)
      }

      setOpportunities(found)
      setCurrentEditValue(found[0].originalBullet)
      setIsAnalyzing(false)
    }

    init()
  }, [])

  // 2. Sync Edit Value when Index Changes (Instant now!)
  useEffect(() => {
    if (opportunities.length > 0) {
      setCurrentEditValue(opportunities[currentIndex].originalBullet)
    }
  }, [currentIndex])

  const handleSaveAndNext = () => {
    const updated = [...opportunities]
    updated[currentIndex].finalBullet = currentEditValue
    setOpportunities(updated)
    nextStep(updated)
  }

  const handleSkip = () => {
    const updated = [...opportunities]
    updated[currentIndex].finalBullet = opportunities[currentIndex].originalBullet.replace(' [ADD METRIC]', '')
    setOpportunities(updated)
    nextStep(updated)
  }

  const nextStep = (currentOpps) => {
    if (currentIndex < currentOpps.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      finalizeResume(currentOpps)
    }
  }

  const finalizeResume = (finalOpps) => {
    const updatedResume = JSON.parse(JSON.stringify(resumeData))
    finalOpps.forEach(opp => {
      if (opp.finalBullet) {
        updatedResume.experience[opp.expIdx].bullets[opp.bulletIdx] = opp.finalBullet
      }
    })
    onComplete(updatedResume)
  }

  // --- RENDER ---
  if (isAnalyzing) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: '100px' }}>
        <div className="loading-spinner" style={{ width: '48px', height: '48px', borderColor: 'var(--accent-purple) transparent transparent transparent' }}></div>
        <h2 style={{ marginTop: '24px', fontSize: '20px', fontWeight: '600' }}>
          Analyzing your resume for impact...
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>Identifying places to add metrics</p>
      </div>
    )
  }

  const currentOpp = opportunities[currentIndex]
  const progressPercent = ((currentIndex) / opportunities.length) * 100

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1 className="page-title" style={{ fontSize: '24px', margin: 0 }}>Quantify Your Impact</h1>
          <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500' }}>
            {currentIndex + 1} of {opportunities.length}
          </span>
        </div>
        <div style={{ width: '100%', height: '8px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--accent-purple)', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        
        {/* The AI Coach (Context) */}
        <div className="card" style={{ 
          background: 'linear-gradient(135deg, #fdfbf7 0%, #ffffff 100%)', 
          borderLeft: '4px solid var(--accent-purple)',
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ 
              fontSize: '20px', 
              background: 'rgba(124, 58, 237, 0.1)', 
              color: 'var(--accent-purple)',
              minWidth: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              ✨
            </div>
            <div>
              <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '4px' }}>
                {currentOpp.company}
              </div>
              <p style={{ fontSize: '16px', color: 'var(--text-primary)', fontWeight: '500', lineHeight: '1.4' }}>
                {currentOpp.question}
              </p>
            </div>
          </div>
        </div>

        {/* The Editor */}
        <div className="card" style={{ padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', color: 'var(--text-secondary)' }}>
            Edit Bullet Point
          </label>
          
          <textarea
            value={currentEditValue}
            onChange={(e) => setCurrentEditValue(e.target.value)}
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '16px',
              fontSize: '16px',
              lineHeight: '1.6',
              border: '2px solid var(--accent-purple)',
              borderRadius: '12px',
              fontFamily: 'inherit',
              marginBottom: '12px',
              outline: 'none',
              boxShadow: '0 0 0 4px rgba(124, 58, 237, 0.1)',
              resize: 'vertical'
            }}
            autoFocus
          />
          
          <div className="button-group" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
             <button 
              className="btn btn-ghost" 
              onClick={handleSkip}
            >
              Skip
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleSaveAndNext}
            >
              {currentIndex === opportunities.length - 1 ? 'Finish Review' : 'Next Bullet →'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

export default MetricPrompter
