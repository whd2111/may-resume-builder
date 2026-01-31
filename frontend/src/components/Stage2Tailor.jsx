import { useState, useEffect } from 'react'
import { callClaude } from '../utils/claudeApi'
import { generateDOCX } from '../utils/docxGenerator'
import { ArrowLeftIcon, TargetIcon, WritingIcon, DownloadIcon, CheckIcon } from '../utils/icons'
import { extractJobChecklist } from '../utils/checklistExtractor'
import { scoreAndSelectBullets } from '../utils/bulletScorer'
import { CHECKLIST_TAILORING_PROMPT } from '../utils/tailoringPrompts'
import { useApplications } from '../hooks/useApplications'
import { validateTailoredResume, quickValidate } from '../utils/tailoredResumeValidator'
import { usePrimeResume } from '../hooks/usePrimeResume'
import { usePrimeBullets } from '../hooks/usePrimeBullets'
import { primeBulletsToResumeJson } from '../utils/primeResumeAdapter'
import { useResumes } from '../hooks/useResumes'

// Prompt for trimming overflow content
const TRIM_PROMPT = `You are May, an expert resume editor. The user's resume is currently OVER 1 PAGE and needs to be trimmed.

YOUR TASK: Trim the resume to fit on exactly 1 page by removing approximately {LINES_OVER} lines worth of content.

TRIMMING RULES (in priority order):
1. FIRST: Shorten verbose bullets - tighten language, remove filler words
2. SECOND: Remove the LEAST impactful bullets from roles with 5+ bullets (keep min 2-3 per role)
3. THIRD: Combine similar bullets if possible
4. FOURTH: Trim older/less relevant experience more aggressively than recent experience
5. NEVER remove entire jobs or education entries
6. NEVER fabricate or change factual information
7. Preserve the most impressive metrics and achievements

ESTIMATE: Each bullet point is roughly 1-2 lines. To remove {LINES_OVER} lines, you may need to:
- Remove {BULLETS_TO_REMOVE} bullet points, OR
- Significantly shorten {BULLETS_TO_SHORTEN} bullets

Return the trimmed resume in the EXACT same JSON format as the input, with an "improvements" field describing what was trimmed.`;

/**
 * Sort experience array in reverse chronological order
 * Present jobs come first, then sorted by end year descending
 */
function sortExperienceChronologically(experience) {
  if (!experience || !Array.isArray(experience)) return experience
  
  return [...experience].sort((a, b) => {
    const parseDate = (dateStr) => {
      if (!dateStr) return { start: 0, end: 0, isPresent: false }
      const isPresent = /present/i.test(dateStr)
      const years = dateStr.match(/\d{4}/g) || []
      const start = years[0] ? parseInt(years[0], 10) : 0
      const end = isPresent ? 9999 : (years[1] ? parseInt(years[1], 10) : start)
      return { start, end, isPresent }
    }
    
    const aDate = parseDate(a.dates)
    const bDate = parseDate(b.dates)
    
    if (aDate.isPresent && !bDate.isPresent) return -1
    if (!aDate.isPresent && bDate.isPresent) return 1
    if (aDate.isPresent && bDate.isPresent) return bDate.start - aDate.start
    if (bDate.end !== aDate.end) return bDate.end - aDate.end
    return bDate.start - aDate.start
  })
}

function Stage2Tailor({ primaryResume, onBack, onNavigate }) {
  const { createApplication } = useApplications()
  const { createResume, masterResume } = useResumes()
  const { primeResume } = usePrimeResume()
  const { bullets: primeBullets, loading: primeBulletsLoading } = usePrimeBullets(primeResume?.id)
  
  const [jobDescription, setJobDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStage, setLoadingStage] = useState('') // 'checklist', 'scoring', 'tailoring', 'validating'
  
  // New checklist-based flow
  const [checklist, setChecklist] = useState(null)
  const [selection, setSelection] = useState(null)
  const [tailoredResume, setTailoredResume] = useState(null)
  const [rewrittenBullets, setRewrittenBullets] = useState(null)
  
  // The resume data used for scoring (prime or fallback)
  const [scoringResumeData, setScoringResumeData] = useState(null)
  
  // Validation state
  const [validationResult, setValidationResult] = useState(null)
  const [showValidation, setShowValidation] = useState(false)
  
  // UI state
  const [showChecklist, setShowChecklist] = useState(false)
  const [showSelection, setShowSelection] = useState(false)
  const [showComparison, setShowComparison] = useState(true)
  const [showFullPreview, setShowFullPreview] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Determine the resume data to use for scoring
  useEffect(() => {
    if (primeBullets && primeBullets.length > 0 && primeResume) {
      // Use Prime bullets converted to resume format
      const primeResumeJson = primeBulletsToResumeJson(primeBullets, primeResume.summary_json || {})
      // Merge with primary resume contact info if available
      if (primaryResume) {
        primeResumeJson.name = primeResumeJson.name || primaryResume.name
        primeResumeJson.contact = primeResumeJson.contact?.email ? primeResumeJson.contact : primaryResume.contact
        primeResumeJson.education = primeResumeJson.education?.length > 0 ? primeResumeJson.education : primaryResume.education
        primeResumeJson.skills = primeResumeJson.skills?.length > 0 ? primeResumeJson.skills : primaryResume.skills
      }
      setScoringResumeData(primeResumeJson)
      console.log('Using Prime Resume for tailoring:', {
        bulletCount: primeBullets.length,
        experienceCount: primeResumeJson.experience?.length
      })
    } else if (primaryResume) {
      // Fallback to primary resume
      setScoringResumeData(primaryResume)
      console.log('Falling back to primary resume for tailoring')
    }
  }, [primeBullets, primeResume, primaryResume])

  // New checklist-based pipeline
  const handleAnalyzeWithChecklist = async (e) => {
    e.preventDefault()
    if (!jobDescription.trim()) return

    // Use scoringResumeData (from Prime or fallback to primary)
    const resumeToUse = scoringResumeData || primaryResume
    if (!resumeToUse) {
      alert('No resume data available. Please build a resume first.')
      return
    }

    setIsLoading(true)
    setChecklist(null)
    setSelection(null)
    setTailoredResume(null)
    setValidationResult(null)
    setRewrittenBullets(null)
    setShowValidation(false)

    try {
      // Debug: Log the resume being used for tailoring
      console.log('Using resume for tailoring:', {
        source: primeBullets?.length > 0 ? 'Prime Resume' : 'Primary Resume',
        name: resumeToUse?.name,
        experienceCount: resumeToUse?.experience?.length,
        firstCompany: resumeToUse?.experience?.[0]?.company,
        bulletCount: resumeToUse?.experience?.reduce((acc, exp) => acc + (exp.bullets?.length || 0), 0)
      })
      // Step 1: Extract job checklist
      setLoadingStage('checklist')
      const extractedChecklist = await extractJobChecklist(jobDescription)
      setChecklist(extractedChecklist)

      // Step 2: Score and select bullets
      setLoadingStage('scoring')
      const selectionResult = scoreAndSelectBullets(resumeToUse, extractedChecklist)
      setSelection(selectionResult)

      // Step 3: Tailor the selected bullets
      setLoadingStage('tailoring')
      const { tailored, bullets } = await handleTailorSelectedBullets(extractedChecklist, selectionResult, resumeToUse)

      // Step 4: Validate the tailored resume
      setLoadingStage('validating')
      await handleValidation(tailored, extractedChecklist, bullets)

    } catch (error) {
      console.error('Pipeline error:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setIsLoading(false)
      setLoadingStage('')
    }
  }

  const handleTailorSelectedBullets = async (checklistData, selectionData, resumeToUse) => {
    try {
      // Prepare the prompt with checklist and selected bullets, including original context
      const bulletsWithContext = selectionData.selected_bullets.map(bullet => {
        // Find the original experience context
        const match = bullet.bullet_id.match(/exp(\d+)_bullet(\d+)/)
        if (match) {
          const expIndex = parseInt(match[1], 10)
          const exp = resumeToUse?.experience?.[expIndex]
          return {
            ...bullet,
            original_company: exp?.company,
            original_title: exp?.title,
            original_dates: exp?.dates,
          }
        }
        return bullet
      })
      
      const prompt = `Job Checklist:
${JSON.stringify(checklistData, null, 2)}

Selected Bullets to Rewrite (in priority order with original context):
${JSON.stringify(bulletsWithContext, null, 2)}

Coverage Report:
- Covered must-haves: ${selectionData.coverage_report.covered_must_haves.join(', ')}
- Missing must-haves: ${selectionData.coverage_report.missing_must_haves.join(', ')}

IMPORTANT: Each bullet includes original_company, original_title, and original_dates.
Make sure your rewrites make sense for that specific company and role context.

CRITICAL RULES FOR REWRITING:
1. Do NOT add activities that don't match the company type (e.g., don't add "martial arts" to Ogilvy & Mather, don't add "surgery" to PwC)
2. If a bullet is from an IRRELEVANT company/role (e.g., marketing agency when applying for martial arts instructor), DO NOT force-fit job keywords
3. Instead, emphasize TRANSFERABLE skills that make sense for that company (e.g., leadership, communication, data analysis, project management)
4. NEVER invent activities that didn't happen at that company - be truthful above all else
5. If the selected bullets don't perfectly cover all job requirements, that's OK - gaps are better than hallucinations
6. Maintain CHRONOLOGICAL ORDER - keep bullets in their original sequence within each experience (most recent accomplishments first)

Rewrite these bullets to emphasize the must-haves and primary keywords while following the rules above. Return JSON only.`

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
      const tailored = applyRewrittenBullets(resumeToUse, result.rewritten_bullets)
      
      // Return both the tailored resume and the rewritten bullets for validation
      return {
        tailored,
        bullets: result.rewritten_bullets
      }

    } catch (error) {
      console.error('Tailoring error:', error)
      throw new Error(`Failed to tailor bullets: ${error.message}`)
    }
  }

  const handleValidation = async (tailored, checklistData, bullets) => {
    try {
      // Quick client-side validation first
      const quickCheck = quickValidate(tailored, checklistData, bullets)
      
      if (quickCheck.has_critical_issues) {
        console.warn('Quick validation found critical issues:', quickCheck.issues)
      }
      
      // Run full LLM validation
      const validation = await validateTailoredResume(tailored, checklistData, bullets)
      setValidationResult(validation)
      setRewrittenBullets(bullets)
      setTailoredResume(tailored)
      
      // If validation fails critically, auto-expand validation details
      if (!validation.passed_validation && validation.recommendation === 'reject') {
        console.error('Validation failed:', validation)
        setShowValidation(true) // Auto-expand validation details so user can review issues
      }
      
    } catch (error) {
      console.error('Validation error:', error)
      // On validation error, still show the resume
      setTailoredResume(tailored)
      setRewrittenBullets(bullets)
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

    // CRITICAL: Sort experience in reverse chronological order (Present jobs first)
    tailored.experience = sortExperienceChronologically(tailored.experience)

    return tailored
  }

  const handleRetailor = () => {
    setChecklist(null)
    setSelection(null)
    setTailoredResume(null)
    setValidationResult(null)
    setRewrittenBullets(null)
    setShowFullPreview(false)
    setShowComparison(true)
  }

  const handleStartOver = () => {
    setJobDescription('')
    setChecklist(null)
    setSelection(null)
    setTailoredResume(null)
    setValidationResult(null)
    setRewrittenBullets(null)
    setIsSaved(false)
    setShowFullPreview(false)
    setShowComparison(true)
  }

  const handleDownload = async () => {
    try {
      // Use company name from checklist if available
      const companyName = checklist?.job_metadata?.company_name || 'TAILORED'
      
      // Try to generate - if overflow, auto-trim and retry
      try {
        await generateDOCX(tailoredResume, null, companyName)
        alert('Resume downloaded successfully!')
      } catch (docError) {
        // If overflow, auto-trim and retry once
        if (docError.code === 'RESUME_OVERFLOW') {
          console.log(`📏 Overflow detected - auto-trimming tailored resume...`)
          
          // Calculate trim amount
          const linesToTrim = Math.ceil(docError.overflowPercent / 2)
          
          const trimPrompt = TRIM_PROMPT
            .replace(/{LINES_OVER}/g, linesToTrim.toString())
            .replace('{BULLETS_TO_REMOVE}', Math.ceil(linesToTrim / 1.5).toString())
            .replace('{BULLETS_TO_SHORTEN}', Math.ceil(linesToTrim * 1.5).toString())

          const trimMessage = `Here is the resume that needs to be trimmed by approximately ${linesToTrim} lines:

${JSON.stringify(tailoredResume, null, 2)}

Please trim this resume to fit on 1 page. Return ONLY the JSON object with the trimmed resume data.`

          const trimResponse = await callClaude(null, [{ role: 'user', content: trimMessage }], trimPrompt)
          
          const trimMatch = trimResponse.match(/\{[\s\S]*"name"[\s\S]*\}/)
          if (trimMatch) {
            const trimmedData = JSON.parse(trimMatch[0])
            const sortedTrimmed = {
              ...trimmedData,
              experience: sortExperienceChronologically(trimmedData.experience)
            }
            
            // Update state with trimmed version
            setTailoredResume(sortedTrimmed)
            
            // Retry document generation
            await generateDOCX(sortedTrimmed, null, companyName)
            alert('Resume auto-trimmed and downloaded successfully!')
            console.log(`✅ Auto-trim successful`)
          } else {
            throw new Error('Auto-trim failed - could not parse trimmed resume')
          }
        } else {
          throw docError
        }
      }
    } catch (error) {
      if (error.code === 'RESUME_OVERFLOW') {
        alert(`❌ Resume is ${error.overflowPercent}% too long to fit on 1 page.\n\nAuto-trim attempted but still exceeds limit.\n\nPlease manually edit to remove ~${Math.ceil(error.overflowPercent / 2)} more lines.`)
      } else {
        alert(`Error generating document: ${error.message}`)
      }
    }
  }

  const handleSaveApplication = async () => {
    if (!checklist || !tailoredResume) return

    setIsSaving(true)
    try {
      // First create the application
      const application = await createApplication({
        job_description: jobDescription,
        company_name: checklist.job_metadata?.company_name || 'Unknown Company',
        job_title: checklist.job_metadata?.job_title || 'Unknown Position',
        checklist_json: checklist,
        selection_json: selection,
        resume_id: null, // Will update after creating the derived resume
        tailored_resume_data: tailoredResume,
        status: 'tailored',
      })

      // Create a derived resume with provenance
      try {
        const companyName = checklist.job_metadata?.company_name || 'Unknown'
        const jobTitle = checklist.job_metadata?.job_title || 'Position'
        const tailoredResumeTitle = `${companyName} - ${jobTitle}`
        
        const derivedResume = await createResume(
          tailoredResumeTitle,
          tailoredResume,
          false, // not a master resume
          `${companyName}: ${jobTitle}` // tailored_for
        )

        // Note: The derived resume will have prime_resume_id and application_id set
        // if the resumes table has been updated with those columns.
        // For now, we create the resume with basic provenance via tailored_for field.
        
        console.log('Saved tailored resume with provenance:', {
          resumeId: derivedResume?.id,
          applicationId: application?.id,
          primeResumeId: primeResume?.id
        })
      } catch (resumeError) {
        // Don't fail the whole operation if resume creation fails
        console.warn('Could not save derived resume:', resumeError)
      }

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
          {(scoringResumeData || primaryResume)
            ? "Paste a job description and May will customize your resume to match the requirements"
            : "You need to build a primary 1-page resume first before tailoring"}
        </p>
        {scoringResumeData && (
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: 'var(--space-xs)' }}>
            {primeBullets?.length > 0 ? (
              <>
                <span style={{ 
                  background: 'var(--accent-primary)', 
                  color: 'white', 
                  padding: '2px 8px', 
                  borderRadius: '4px',
                  fontSize: '11px',
                  marginRight: '8px'
                }}>
                  Prime
                </span>
                Using Prime Resume • {primeBullets.length} bullets from {scoringResumeData.experience?.length || 0} experiences
              </>
            ) : (
              <>
                Using resume for: {scoringResumeData.name || 'Unknown'}
                {scoringResumeData.experience && ` • ${scoringResumeData.experience.length} experience entries`}
              </>
            )}
          </p>
        )}
      </div>

      {!scoringResumeData && !primaryResume && (
        <div className="card-premium" style={{ borderLeft: '4px solid #ef4444' }}>
          <p style={{ color: '#b91c1c', fontWeight: '500' }}>
            No primary resume found. Please build one first to enable tailoring.
          </p>
          <button className="btn btn-primary" onClick={() => onNavigate('build')} style={{ marginTop: 'var(--space-md)' }}>
            Go to Resume Builder
          </button>
        </div>
      )}

      {(scoringResumeData || primaryResume) && (
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
                {loadingStage === 'validating' && <CheckIcon />}
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '20px', fontWeight: '500' }}>
                {loadingStage === 'checklist' && 'Extracting job requirements...'}
                {loadingStage === 'scoring' && 'Scoring and selecting bullets...'}
                {loadingStage === 'tailoring' && 'Tailoring selected bullets...'}
                {loadingStage === 'validating' && 'Validating tailored content...'}
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
              {/* Success Summary Card */}
              <div className="card-premium" style={{ 
                background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                borderLeft: '4px solid #10b981',
                textAlign: 'center',
                padding: 'var(--space-2xl)'
              }}>
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  background: '#10b981', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto var(--space-lg)',
                  color: 'white'
                }}>
                  <CheckIcon />
                </div>
                
                <h2 style={{ 
                  fontSize: '24px', 
                  fontWeight: '700', 
                  color: '#065f46',
                  marginBottom: 'var(--space-sm)'
                }}>
                  Resume Tailored for {checklist?.job_metadata?.company_name || 'This Role'}
                </h2>
                <p style={{ 
                  fontSize: '16px', 
                  color: '#047857',
                  marginBottom: 'var(--space-xl)'
                }}>
                  {checklist?.job_metadata?.job_title || 'Position'}
                </p>

                {/* Stats Row */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  gap: 'var(--space-xl)',
                  flexWrap: 'wrap',
                  marginBottom: 'var(--space-xl)'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#059669' }}>
                      {selection?.selected_bullets?.length || 0}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>Bullets Tailored</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#059669' }}>
                      {selection?.coverage_report?.covered_must_haves?.length || 0}/{(selection?.coverage_report?.covered_must_haves?.length || 0) + (selection?.coverage_report?.missing_must_haves?.length || 0)}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>Must-Haves Covered</div>
                  </div>
                </div>

                {/* Missing Skills Warning */}
                {selection?.coverage_report?.missing_must_haves?.length > 0 && (
                  <div style={{ 
                    background: '#fef3c7', 
                    padding: 'var(--space-sm) var(--space-md)', 
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#92400e',
                    marginBottom: 'var(--space-xl)',
                    display: 'inline-block'
                  }}>
                    <strong>Not in your experience:</strong> {selection.coverage_report.missing_must_haves.join(', ')}
                  </div>
                )}

                {/* Primary Actions */}
                <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button onClick={handleDownload} className="btn btn-primary" style={{ minWidth: '180px' }}>
                    <DownloadIcon />
                    Download DOCX
                  </button>
                  <button 
                    onClick={handleSaveApplication} 
                    className="btn btn-secondary"
                    disabled={isSaving || isSaved}
                    style={{
                      minWidth: '180px',
                      background: isSaved ? '#10b981' : undefined,
                      color: isSaved ? 'white' : undefined,
                      borderColor: isSaved ? '#10b981' : undefined
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
                        Saved
                      </>
                    ) : (
                      <>
                        <CheckIcon />
                        Save to Dashboard
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Changes Only Section */}
              <div className="card-premium" style={{ marginTop: 'var(--space-lg)' }}>
                <div 
                  onClick={() => setShowComparison(!showComparison)}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    cursor: 'pointer',
                    padding: 'var(--space-sm) 0'
                  }}
                >
                  <div className="card-title" style={{ margin: 0 }}>
                    <WritingIcon />
                    What Changed ({selection?.selected_bullets?.length || 0} bullets)
                  </div>
                  <span style={{ 
                    fontSize: '20px', 
                    color: 'var(--text-tertiary)',
                    transform: showComparison ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease'
                  }}>
                    ▼
                  </span>
                </div>

                {showComparison && (
                  <div style={{ marginTop: 'var(--space-lg)' }}>
                    {selection?.selected_bullets?.map((selectedBullet, idx) => {
                      // Find the corresponding rewritten bullet
                      const rewritten = rewrittenBullets?.find(b => b.bullet_id === selectedBullet.bullet_id)
                      if (!rewritten) return null

                      // Get company/role context
                      const match = selectedBullet.bullet_id.match(/exp(\d+)_bullet(\d+)/)
                      let company = ''
                      let role = ''
                      if (match) {
                        const expIndex = parseInt(match[1], 10)
                        const exp = (scoringResumeData || primaryResume)?.experience?.[expIndex]
                        company = exp?.company || ''
                        role = exp?.title || ''
                      }

                      return (
                        <div key={selectedBullet.bullet_id} style={{ 
                          marginBottom: 'var(--space-lg)',
                          paddingBottom: 'var(--space-lg)',
                          borderBottom: idx < selection.selected_bullets.length - 1 ? '1px solid var(--border-light)' : 'none'
                        }}>
                          {/* Company/Role Header */}
                          <div style={{ 
                            fontSize: '12px', 
                            fontWeight: '600', 
                            color: 'var(--text-tertiary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: 'var(--space-sm)'
                          }}>
                            {company}{role ? ` • ${role}` : ''}
                          </div>

                          {/* Before */}
                          <div style={{ 
                            background: '#fef2f2', 
                            padding: 'var(--space-sm) var(--space-md)',
                            borderRadius: '8px',
                            borderLeft: '3px solid #ef4444',
                            marginBottom: 'var(--space-sm)',
                            fontSize: '14px',
                            lineHeight: '1.6'
                          }}>
                            <span style={{ 
                              fontSize: '11px', 
                              fontWeight: '600', 
                              color: '#dc2626',
                              display: 'block',
                              marginBottom: '4px'
                            }}>
                              BEFORE
                            </span>
                            {selectedBullet.original_text}
                          </div>

                          {/* After */}
                          <div style={{ 
                            background: '#f0fdf4', 
                            padding: 'var(--space-sm) var(--space-md)',
                            borderRadius: '8px',
                            borderLeft: '3px solid #10b981',
                            fontSize: '14px',
                            lineHeight: '1.6'
                          }}>
                            <span style={{ 
                              fontSize: '11px', 
                              fontWeight: '600', 
                              color: '#059669',
                              display: 'block',
                              marginBottom: '4px'
                            }}>
                              AFTER
                            </span>
                            {rewritten.new_text}
                          </div>

                          {/* Matched Keywords */}
                          {selectedBullet.matched_terms?.length > 0 && (
                            <div style={{ 
                              marginTop: 'var(--space-sm)',
                              display: 'flex',
                              gap: '6px',
                              flexWrap: 'wrap'
                            }}>
                              {selectedBullet.matched_terms.slice(0, 4).map((term, termIdx) => (
                                <span key={termIdx} style={{
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  background: '#e0e7ff',
                                  color: '#4338ca',
                                  borderRadius: '4px'
                                }}>
                                  {term}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Full Resume Preview (Collapsed by Default) */}
              <div className="card-premium" style={{ marginTop: 'var(--space-lg)' }}>
                <div 
                  onClick={() => setShowFullPreview(!showFullPreview)}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    cursor: 'pointer',
                    padding: 'var(--space-sm) 0'
                  }}
                >
                  <div className="card-title" style={{ margin: 0 }}>
                    <TargetIcon />
                    View Full Resume
                  </div>
                  <span style={{ 
                    fontSize: '20px', 
                    color: 'var(--text-tertiary)',
                    transform: showFullPreview ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease'
                  }}>
                    ▼
                  </span>
                </div>

                {showFullPreview && (
                  <div style={{ marginTop: 'var(--space-lg)', padding: 'var(--space-lg)', background: '#fafafa', borderRadius: '12px' }}>
                    <div style={{ textAlign: 'center', borderBottom: '2px solid var(--text-primary)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                      <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: 'var(--space-xs)' }}>{tailoredResume.name}</h1>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {tailoredResume.contact.phone} | {tailoredResume.contact.email}
                        {tailoredResume.contact.linkedin && ` | ${tailoredResume.contact.linkedin}`}
                      </p>
                    </div>

                    {tailoredResume.experience && tailoredResume.experience.map((exp, expIdx) => (
                      <div key={expIdx} style={{ marginBottom: 'var(--space-lg)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px' }}>
                          <span>{exp.company}</span>
                          <span>{exp.location}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontStyle: 'italic', marginBottom: 'var(--space-sm)' }}>
                          <span>{exp.title}</span>
                          <span>{exp.dates}</span>
                        </div>
                        <ul style={{ paddingLeft: '20px', margin: 0 }}>
                          {exp.bullets.map((bullet, bulletIdx) => {
                            const bulletId = `exp${expIdx}_bullet${bulletIdx}`
                            const wasChanged = selection?.selected_bullets.some(b => b.bullet_id === bulletId)
                            
                            return (
                              <li key={bulletIdx} style={{ 
                                fontSize: '13px', 
                                marginBottom: '4px',
                                lineHeight: '1.5',
                                background: wasChanged ? '#fff7ed' : 'transparent',
                                padding: wasChanged ? '2px 6px' : '0',
                                borderRadius: '4px',
                                marginLeft: wasChanged ? '-6px' : '0'
                              }}>
                                {bullet}
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Secondary Actions */}
              <div className="button-group" style={{ marginTop: 'var(--space-xl)', justifyContent: 'center' }}>
                <button 
                  onClick={handleStartOver}
                  className="btn btn-secondary"
                >
                  Tailor for Another Job
                </button>
                <button 
                  onClick={handleRetailor} 
                  className="btn btn-secondary"
                >
                  ← Back to Analysis
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
