// Tailored Resume Validator
// Validates that tailored resume content makes sense in context
// Catches hallucinations, mismatched content, and nonsensical rewrites

import { callClaude } from './claudeApi'

/**
 * System prompt for the resume validator agent
 * Focuses on detecting nonsensical content that doesn't match job/company context
 */
const VALIDATOR_SYSTEM_PROMPT = `You are a resume validation expert. Your job is to check if tailored resume bullets make sense in their context.

VALIDATION RULES:
1. **CONTEXTUAL ACCURACY**: Check if bullet content matches the company/role context
   - Example BAD: "martial arts instruction" at Ogilvy & Mather (a marketing/advertising agency)
   - Example BAD: "martial arts coaching" at PwC (a consulting firm)
   - Example BAD: "blockchain development" at a healthcare non-profit
   - Example BAD: "rocket propulsion" at a retail company
   - Example BAD: "physical education" or "sports coaching" at professional services firms
   - CRITICAL: Check if the industry/activities mentioned in bullets actually match the company type
   
2. **CONTENT CONSISTENCY**: Verify bullets relate to the job title
   - Marketing Intern should NOT have engineering/coding as primary focus
   - Risk Assurance Intern should NOT focus on sales activities
   - Software Engineer should NOT focus on manual labor tasks

3. **TEMPORAL LOGIC**: Check that content makes sense for the time period
   - 2017 internships shouldn't mention 2023 technologies
   - Past positions should use past tense verbs

4. **REALITY CHECK**: Flag impossible or highly unlikely scenarios
   - Intern managing 50+ person teams
   - Entry-level role making executive decisions
   - Wildly mismatched industry experience

OUTPUT FORMAT:
Return ONLY valid JSON (no markdown, no code blocks):
{
  "is_valid": true/false,
  "validation_score": 0-100,
  "issues": [
    {
      "severity": "critical|warning|minor",
      "bullet_id": "exp0_bullet0",
      "issue": "Description of the problem",
      "context": "Why this doesn't make sense"
    }
  ],
  "passed_validation": true/false,
  "recommendation": "accept|reject|review"
}

SCORING:
- 90-100: Perfect, accept immediately
- 70-89: Good with minor issues, accept with warnings
- 50-69: Moderate issues, recommend manual review
- 0-49: Critical issues, reject and retry

Set "passed_validation" to true if validation_score >= 70.
Set "recommendation" to "accept" if score >= 70, "review" if 50-69, "reject" if < 50.

Return JSON now.`

/**
 * Format resume and job context for validation
 */
function formatValidationContext(tailoredResume, jobChecklist, rewrittenBullets) {
  const companyName = jobChecklist?.job_metadata?.company_name || 'Unknown Company'
  const jobTitle = jobChecklist?.job_metadata?.job_title || 'Unknown Position'
  
  let context = `JOB CONTEXT:\n`
  context += `Company: ${companyName}\n`
  context += `Position: ${jobTitle}\n`
  context += `Industry/Type: ${jobChecklist?.job_metadata?.industry || 'Not specified'}\n\n`
  
  context += `TAILORED RESUME CONTENT TO VALIDATE:\n\n`
  
  tailoredResume.experience?.forEach((exp, expIdx) => {
    context += `\n${exp.company} - ${exp.title} (${exp.dates})\n`
    context += `Location: ${exp.location}\n`
    
    exp.bullets.forEach((bullet, bulletIdx) => {
      const bulletId = `exp${expIdx}_bullet${bulletIdx}`
      const wasRewritten = rewrittenBullets.some(r => r.bullet_id === bulletId)
      
      if (wasRewritten) {
        context += `  • [TAILORED] ${bullet} [ID: ${bulletId}]\n`
      } else {
        context += `  • ${bullet}\n`
      }
    })
  })
  
  context += `\n\nVALIDATION TASK:\n`
  context += `Check if the [TAILORED] bullets make sense given:\n`
  context += `1. The company context (${companyName})\n`
  context += `2. The job title (${jobTitle})\n`
  context += `3. The position metadata (title, dates, location)\n`
  context += `\nFlag any bullets that seem nonsensical, mismatched, or hallucinated.`
  
  return context
}

/**
 * Validate a tailored resume for contextual accuracy
 * @param {Object} tailoredResume - The tailored resume data
 * @param {Object} jobChecklist - The job checklist used for tailoring
 * @param {Array} rewrittenBullets - Array of {bullet_id, new_text} for rewritten bullets
 * @returns {Promise<Object>} - Validation result
 */
export async function validateTailoredResume(tailoredResume, jobChecklist, rewrittenBullets) {
  try {
    const validationContext = formatValidationContext(tailoredResume, jobChecklist, rewrittenBullets)
    
    const response = await callClaude(
      null,
      [{ role: 'user', content: validationContext }],
      VALIDATOR_SYSTEM_PROMPT
    )
    
    // Parse response - clean markdown if present
    let cleanedResponse = response.trim()
    cleanedResponse = cleanedResponse.replace(/^```json?\s*/i, '')
    cleanedResponse = cleanedResponse.replace(/\s*```$/, '')
    cleanedResponse = cleanedResponse.trim()
    
    const validationResult = JSON.parse(cleanedResponse)
    
    // Add metadata
    validationResult.validated_at = new Date().toISOString()
    validationResult.company_name = jobChecklist?.job_metadata?.company_name
    validationResult.job_title = jobChecklist?.job_metadata?.job_title
    
    return validationResult
  } catch (error) {
    console.error('Validation error:', error)
    // On validation error, return a permissive result but log the issue
    return {
      is_valid: true,
      validation_score: 50,
      issues: [{
        severity: 'warning',
        issue: 'Validation check failed',
        context: error.message
      }],
      passed_validation: true, // Permissive fallback
      recommendation: 'review',
      validation_error: error.message
    }
  }
}

/**
 * Quick client-side heuristic validation (runs before LLM validation)
 * Catches obvious mismatches without API calls
 */
export function quickValidate(tailoredResume, jobChecklist, rewrittenBullets) {
  const issues = []
  const companyName = jobChecklist?.job_metadata?.company_name?.toLowerCase() || ''
  const jobTitle = jobChecklist?.job_metadata?.job_title?.toLowerCase() || ''
  
  // Check each rewritten bullet
  rewrittenBullets.forEach(({ bullet_id, new_text }) => {
    const lowerText = new_text.toLowerCase()
    
    // Parse bullet_id to find the experience
    const match = bullet_id.match(/exp(\d+)_bullet(\d+)/)
    if (match) {
      const expIndex = parseInt(match[1], 10)
      const exp = tailoredResume.experience?.[expIndex]
      
      if (exp) {
        const expCompany = exp.company.toLowerCase()
        const expTitle = exp.title.toLowerCase()
        
        // Heuristic checks
        // 1. Check for industry mismatches (extend this list as needed)
        const techPatterns = ['machine learning', 'blockchain', 'cryptocurrency', 'neural network']
        const physicalPatterns = ['martial arts', 'boxing', 'karate', 'judo', 'construction', 'carpentry']
        const medicalPatterns = ['surgery', 'diagnosis', 'prescription', 'patient care']
        
        // If applying to tech company but bullet mentions martial arts
        if (companyName.includes('tech') || companyName.includes('software')) {
          physicalPatterns.forEach(pattern => {
            if (lowerText.includes(pattern)) {
              issues.push({
                severity: 'critical',
                bullet_id,
                issue: `Mentions "${pattern}" in tech context`,
                context: `Unlikely for ${expCompany} (${expTitle}) to involve ${pattern}`
              })
            }
          })
        }
        
        // If marketing/advertising company mentions unrelated physical activities
        const marketingCompanies = ['ogilvy', 'mather', 'wpp', 'publicis', 'omnicom', 'dentsu', 
                                     'marketing', 'advertising', 'agency', 'creative agency', 'ad agency']
        const isMarketingCompany = marketingCompanies.some(term => 
          expCompany.includes(term) || companyName.includes(term)
        )
        
        if (isMarketingCompany) {
          physicalPatterns.forEach(pattern => {
            if (lowerText.includes(pattern)) {
              issues.push({
                severity: 'critical',
                bullet_id,
                issue: `Mentions "${pattern}" at ${exp.company}`,
                context: `${exp.company} is a marketing/advertising company, not a ${pattern} organization. This is likely a hallucination.`
              })
            }
          })
        }
        
        // Consulting/advisory firms shouldn't have physical labor mentions
        const consultingCompanies = ['pwc', 'pricewaterhouse', 'deloitte', 'kpmg', 'ey', 'mckinsey', 'bain', 'bcg']
        const isConsultingCompany = consultingCompanies.some(term => 
          expCompany.includes(term) || companyName.includes(term)
        )
        
        if (isConsultingCompany) {
          physicalPatterns.forEach(pattern => {
            if (lowerText.includes(pattern)) {
              issues.push({
                severity: 'critical',
                bullet_id,
                issue: `Mentions "${pattern}" at ${exp.company}`,
                context: `${exp.company} is a consulting firm, not a ${pattern} organization. This is likely a hallucination.`
              })
            }
          })
        }
        
        // Add more heuristics as patterns emerge
      }
    }
  })
  
  return {
    has_critical_issues: issues.some(i => i.severity === 'critical'),
    issues,
    passed_quick_check: issues.length === 0
  }
}
