import { useState } from 'react'
import { callClaude } from '../utils/claudeApi'
import { generateDOCX } from '../utils/docxGenerator'
import { ArrowLeftIcon, TargetIcon, WritingIcon, DownloadIcon, CheckIcon } from '../utils/icons'
import { extractJobChecklist } from '../utils/checklistExtractor'
import { scoreAndSelectBullets } from '../utils/bulletScorer'
import { CHECKLIST_TAILORING_PROMPT } from '../utils/tailoringPrompts'
import { useApplications } from '../hooks/useApplications'

function Stage2Tailor({ primaryResume, onBack }) {
  const { createApplication } = useApplications()
  const [jobDescription, setJobDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStage, setLoadingStage] = useState('') // 'checklist', 'scoring', 'tailoring'
  
  // New checklist-based flow
  const [checklist, setChecklist] = useState(null)
  const [selection, setSelection] = useState(null)
  const [tailoredResume, setTailoredResume] = useState(null)
  
  // UI state
  const [showChecklist, setShowChecklist] = useState(false)
  const [showSelection, setShowSelection] = useState(false)
  const [showComparison, setShowComparison] = useState(true)
  const [isSaved, setIsSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // New checklist-based pipeline
  const handleAnalyzeWithChecklist = async (e) => {
    e.preventDefault()
    if (!jobDescription.trim()) return

    setIsLoading(true)
    setChecklist(null)
    setSelection(null)
    setTailoredResume(null)

    try {
      // Step 1: Extract job checklist
      setLoadingStage('checklist')
      const extractedChecklist = await extractJobChecklist(jobDescription)
      setChecklist(extractedChecklist)

      // Step 2: Score and select bullets
      setLoadingStage('scoring')
      const selectionResult = scoreAndSelectBullets(primaryResume, extractedChecklist)
      setSelection(selectionResult)

      // Step 3: Tailor the selected bullets
      setLoadingStage('tailoring')
      await handleTailorSelectedBullets(extractedChecklist, selectionResult)

    } catch (error) {
      console.error('Pipeline error:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setIsLoading(false)
      setLoadingStage('')
    }
  }

  const handleTailorSelectedBullets = async (checklistData, selectionData) => {
    try {
      // Prepare the prompt with checklist and selected bullets
      const prompt = `Job Checklist:
${JSON.stringify(checklistData, null, 2)}

Selected Bullets to Rewrite (in priority order):
${JSON.stringify(selectionData.selected_bullets, null, 2)}

Coverage Report:
- Covered must-haves: ${selectionData.coverage_report.covered_must_haves.join(', ')}
- Missing must-haves: ${selectionData.coverage_report.missing_must_haves.join(', ')}

Rewrite these bullets to emphasize the must-haves and primary keywords. Return JSON only.`

      const response = await callClaude(
        null, 
        [{ role: 'user', content: prompt }], 
        CHECKLIST_TAILORING_PROMPT
      )

      // Parse response - clean markdown if present
      let cleanedResponse = response.trim()
      cleanedResponse = cleanedResponse.replace(/^```json?\s*/i, '')
      cleanedResponse = cleanedResponse.replace(/\s*```$/, '')
      cleanedResponse = cleanedResponse.trim()

      const result = JSON.parse(cleanedResponse)
      
      // Apply the rewritten bullets to create tailored resume
      const tailored = applyRewrittenBullets(primaryResume, result.rewritten_bullets)
      setTailoredResume(tailored)

    } catch (error) {
      console.error('Tailoring error:', error)
      throw new Error(`Failed to tailor bullets: ${error.message}`)
    }
  }

  const applyRewrittenBullets = (resume, rewrittenBullets) => {
    // Deep clone the resume
    const tailored = JSON.parse(JSON.stringify(resume))

    // Apply each rewritten bullet
    rewrittenBullets.forEach(({ bullet_id, new_text }) => {
      // Parse bullet_id like "exp0_bullet2"
      const match = bullet_id.match(/exp(\d+)_bullet(\d+)/)
      if (match) {
        const expIndex = parseInt(match[1], 10)
        const bulletIndex = parseInt(match[2], 10)

        if (tailored.experience[expIndex] && tailored.experience[expIndex].bullets[bulletIndex]) {
          tailored.experience[expIndex].bullets[bulletIndex] = new_text
        }
      }
    })

    return tailored
  }

  const handleRetailor = () => {
    setChecklist(null)
    setSelection(null)
    setTailoredResume(null)
  }

  const handleStartOver = () => {
    setJobDescription('')
    setChecklist(null)
    setSelection(null)
    setTailoredResume(null)
    setIsSaved(false)
  }

  const handleDownload = async () => {
    try {
      // Use company name from checklist if available
      const companyName = checklist?.job_metadata?.company_name || 'TAILORED'
      
      await generateDOCX(tailoredResume, null, companyName)
      alert('Resume downloaded successfully!')
    } catch (error) {
      alert(`Error generating document: ${error.message}`)
    }
  }

  const handleSaveApplication = async () => {
    if (!checklist || !tailoredResume) return

    setIsSaving(true)
    try {
      await createApplication({
        job_description: jobDescription,
        company_name: checklist.job_metadata?.company_name || 'Unknown Company',
        job_title: checklist.job_metadata?.job_title || 'Unknown Position',
        checklist_json: checklist,
        selection_json: selection,
        resume_id: null, // Could link to master resume if needed
        tailored_resume_data: tailoredResume,
        status: 'tailored',
      })

      setIsSaved(true)
      alert('Application saved to dashboard!')
    } catch (error) {
      console.error('Error saving application:', error)
      alert(`Error saving application: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
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
          {!checklist && !tailoredResume && !isLoading && (
            <div className="card-premium">
              <div className="card-title">
                <TargetIcon />
                Job Description
              </div>
              <p style={{ marginBottom: 'var(--space-lg)', color: 'var(--text-secondary)', fontSize: '15px' }}>
                Paste the full job posting below. May will extract requirements, score your bullets, and tailor your resume automatically.
              </p>

              <form onSubmit={handleAnalyzeWithChecklist}>
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
                  Analyze & Tailor Resume
                </button>
              </form>
            </div>
          )}

          {isLoading && (
            <div style={{ textAlign: 'center', padding: 'var(--space-3xl) var(--space-xl)' }}>
              <div className="action-card-icon" style={{ margin: '0 auto var(--space-xl)', background: 'var(--gradient-primary)', color: 'white' }}>
                {loadingStage === 'checklist' && <TargetIcon />}
                {loadingStage === 'scoring' && <TargetIcon />}
                {loadingStage === 'tailoring' && <WritingIcon />}
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '20px', fontWeight: '500' }}>
                {loadingStage === 'checklist' && 'Extracting job requirements...'}
                {loadingStage === 'scoring' && 'Scoring and selecting bullets...'}
                {loadingStage === 'tailoring' && 'Tailoring selected bullets...'}
              </p>
              <div className="loading" style={{ marginTop: 'var(--space-lg)' }}></div>
            </div>
          )}

          {/* Show checklist and selection data (before final resume) */}
          {checklist && selection && !tailoredResume && !isLoading && (
            <div className="stagger-1">
              {/* Checklist Summary */}
              <div className="card-premium" style={{ borderLeft: '4px solid #3b82f6', background: '#eff6ff' }}>
                <div className="card-title" style={{ color: '#1e40af' }}>
                  <TargetIcon />
                  Job Analysis Complete
                </div>
                <p style={{ color: '#1e40af', fontSize: '15px', lineHeight: '1.6' }}>
                  Extracted requirements from {checklist.job_metadata.company_name} - {checklist.job_metadata.job_title}
                </p>
                <button
                  onClick={() => setShowChecklist(!showChecklist)}
                  className="btn-secondary"
                  style={{ marginTop: 'var(--space-md)', fontSize: '13px', padding: '6px 12px' }}
                >
                  {showChecklist ? 'Hide' : 'Show'} Checklist Details
                </button>
                
                {showChecklist && (
                  <div style={{ marginTop: 'var(--space-md)', fontSize: '14px', lineHeight: '1.6' }}>
                    <div style={{ marginBottom: 'var(--space-sm)' }}>
                      <strong>Must-Have Skills:</strong> {checklist.must_haves.hard_skills.join(', ')}
                    </div>
                    <div style={{ marginBottom: 'var(--space-sm)' }}>
                      <strong>Must-Have Tools:</strong> {checklist.must_haves.tools.join(', ')}
                    </div>
                    <div>
                      <strong>Primary Keywords:</strong> {checklist.keyword_pack.primary.join(', ')}
                    </div>
                  </div>
                )}
              </div>

              {/* Bullet Selection Summary */}
              <div className="card-premium" style={{ borderLeft: '4px solid #10b981', background: '#f0fdf4' }}>
                <div className="card-title" style={{ color: '#065f46' }}>
                  <WritingIcon />
                  {selection.selected_bullets.length} Bullets Selected for Tailoring
                </div>
                <p style={{ color: '#065f46', fontSize: '15px', lineHeight: '1.6', marginBottom: 'var(--space-md)' }}>
                  Coverage: {selection.coverage_report.covered_must_haves.length} of {selection.coverage_report.covered_must_haves.length + selection.coverage_report.missing_must_haves.length} must-haves covered
                </p>

                {selection.coverage_report.missing_must_haves.length > 0 && (
                  <div style={{ 
                    padding: 'var(--space-sm)', 
                    background: '#fef3c7', 
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#92400e',
                    marginBottom: 'var(--space-md)'
                  }}>
                    <strong>Missing from resume:</strong> {selection.coverage_report.missing_must_haves.join(', ')}
                  </div>
                )}

                <button
                  onClick={() => setShowSelection(!showSelection)}
                  className="btn-secondary"
                  style={{ fontSize: '13px', padding: '6px 12px' }}
                >
                  {showSelection ? 'Hide' : 'Show'} Selected Bullets
                </button>

                {showSelection && (
                  <div style={{ marginTop: 'var(--space-md)' }}>
                    {selection.selected_bullets.slice(0, 5).map((bullet, idx) => (
                      <div key={bullet.bullet_id} style={{ 
                        marginBottom: 'var(--space-sm)', 
                        padding: 'var(--space-sm)',
                        background: 'white',
                        borderRadius: '8px',
                        fontSize: '13px'
                      }}>
                        <div style={{ fontWeight: '600', color: '#065f46', marginBottom: '4px' }}>
                          Score: {bullet.score} - {bullet.matched_terms.slice(0, 3).join(', ')}
                        </div>
                        <div style={{ color: '#6b7280' }}>{bullet.original_text}</div>
                      </div>
                    ))}
                    {selection.selected_bullets.length > 5 && (
                      <div style={{ fontSize: '13px', color: '#6b7280', fontStyle: 'italic' }}>
                        ... and {selection.selected_bullets.length - 5} more bullets
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="button-group" style={{ marginTop: 'var(--space-xl)' }}>
                <button 
                  onClick={handleStartOver}
                  className="btn btn-secondary"
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
                <p style={{ color: '#065f46', fontSize: '15px', lineHeight: '1.6' }}>
                  Tailored {selection?.selected_bullets.length || 0} bullets to emphasize job requirements
                </p>
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

                {/* Experience sections */}
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
                        // Check if this bullet was rewritten
                        const bulletId = `exp${expIdx}_bullet${bulletIdx}`
                        const wasChanged = selection?.selected_bullets.some(b => b.bullet_id === bulletId)
                        
                        return (
                          <li key={bulletIdx} style={{ 
                            fontSize: '14px', 
                            marginBottom: '6px',
                            background: showComparison && wasChanged ? '#fff7ed' : 'transparent',
                            padding: showComparison && wasChanged ? '4px 8px' : '0',
                            borderRadius: '4px',
                            borderLeft: showComparison && wasChanged ? '3px solid #f97316' : 'none'
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
                <button 
                  onClick={handleSaveApplication} 
                  className="btn btn-primary"
                  disabled={isSaving || isSaved}
                  style={{
                    background: isSaved ? '#10b981' : undefined,
                    cursor: isSaved ? 'default' : undefined
                  }}
                >
                  {isSaving ? (
                    <>
                      <div className="loading" style={{ width: '16px', height: '16px' }}></div>
                      Saving...
                    </>
                  ) : isSaved ? (
                    <>
                      <CheckIcon />
                      Saved to Dashboard
                    </>
                  ) : (
                    <>
                      <CheckIcon />
                      Save to Dashboard
                    </>
                  )}
                </button>
                <button onClick={handleDownload} className="btn btn-secondary">
                  <DownloadIcon />
                  Download DOCX
                </button>
                <button 
                  onClick={handleRetailor} 
                  className="btn btn-secondary"
                >
                  ← Back to Analysis
                </button>
                <button 
                  onClick={handleStartOver}
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
