// Job Checklist Extraction & Validation
// Converts unstructured job descriptions into standardized JSON schema

import { callClaude } from './claudeApi'

// Extraction prompt for LLM
const CHECKLIST_EXTRACTION_PROMPT = `You are a job description parser. Extract structured data from the job description and return ONLY valid JSON with no markdown, no code blocks, no explanations.

Your output must conform to this exact schema:
{
  "job_metadata": {
    "job_title": "",
    "company_name": "",
    "locations": [],
    "seniority_level": "intern|junior|mid|senior|lead|manager|director|unknown"
  },
  "top_responsibilities": [
    { "text": "", "priority": "must|high|medium|low" }
  ],
  "must_haves": {
    "hard_skills": [],
    "tools": [],
    "years_experience": ""
  },
  "nice_to_haves": {
    "hard_skills": [],
    "tools": []
  },
  "success_outcomes": [
    { "outcome": "", "metric_types": [] }
  ],
  "keyword_pack": {
    "primary": [],
    "secondary": []
  }
}

HARD LIMITS (strictly enforce):
- top_responsibilities: max 10
- must_haves.hard_skills: max 12
- must_haves.tools: max 10
- nice_to_haves.hard_skills: max 12
- nice_to_haves.tools: max 10
- success_outcomes: max 6
- keyword_pack.primary: max 12
- keyword_pack.secondary: max 20

EXTRACTION RULES:
1. Put "required/must/minimum" into must_haves
2. Put "preferred/plus/nice-to-have" into nice_to_haves
3. Deduplicate and normalize wording, avoid fluff
4. If a term appears repeatedly or is clearly required, include it in keyword_pack.primary
5. Uncertain/secondary items go in keyword_pack.secondary

NORMALIZE these common synonyms:
- "GTM" → "go-to-market"
- "experimentation" ↔ "A/B testing"
- "stakeholder management" ↔ "cross-functional collaboration"
- "financial modeling" ↔ "modeling / scenario analysis"

Return ONLY the JSON object. No markdown formatting, no code blocks, no extra text.`

const REPAIR_JSON_PROMPT = `The following JSON is invalid. Fix it to match the schema exactly and return ONLY valid JSON with no markdown or explanations.

Required schema:
{
  "job_metadata": {
    "job_title": "",
    "company_name": "",
    "locations": [],
    "seniority_level": "intern|junior|mid|senior|lead|manager|director|unknown"
  },
  "top_responsibilities": [
    { "text": "", "priority": "must|high|medium|low" }
  ],
  "must_haves": {
    "hard_skills": [],
    "tools": [],
    "years_experience": ""
  },
  "nice_to_haves": {
    "hard_skills": [],
    "tools": []
  },
  "success_outcomes": [
    { "outcome": "", "metric_types": [] }
  ],
  "keyword_pack": {
    "primary": [],
    "secondary": []
  }
}

Return ONLY the corrected JSON.`

/**
 * Extract job checklist from raw job description text
 * @param {string} jd_text - Raw job description
 * @returns {Promise<Object>} - Validated checklist JSON
 */
export async function extractJobChecklist(jd_text) {
  if (!jd_text || jd_text.trim().length < 50) {
    throw new Error('Job description too short')
  }

  try {
    // Call Claude to extract structured data
    const response = await callClaude(
      null,
      [{ role: 'user', content: `Job Description:\n\n${jd_text}\n\nExtract the checklist:` }],
      CHECKLIST_EXTRACTION_PROMPT
    )

    // Clean response - remove markdown code blocks if present
    let cleanedResponse = response.trim()
    cleanedResponse = cleanedResponse.replace(/^```json?\s*/i, '')
    cleanedResponse = cleanedResponse.replace(/\s*```$/, '')
    cleanedResponse = cleanedResponse.trim()

    // Parse JSON
    let checklist
    try {
      checklist = JSON.parse(cleanedResponse)
    } catch (parseError) {
      console.warn('Initial JSON parse failed, attempting repair:', parseError.message)
      
      // Retry with repair prompt
      const repairResponse = await callClaude(
        null,
        [{ role: 'user', content: `Invalid JSON:\n\n${cleanedResponse}\n\nFix it:` }],
        REPAIR_JSON_PROMPT
      )

      let repairedResponse = repairResponse.trim()
      repairedResponse = repairedResponse.replace(/^```json?\s*/i, '')
      repairedResponse = repairedResponse.replace(/\s*```$/, '')
      repairedResponse = repairedResponse.trim()

      checklist = JSON.parse(repairedResponse)
    }

    // Validate schema
    validateChecklist(checklist)

    return checklist
  } catch (error) {
    console.error('Checklist extraction error:', error)
    throw new Error(`Failed to extract checklist: ${error.message}`)
  }
}

/**
 * Validate checklist JSON against schema
 * @param {Object} checklist - Checklist object to validate
 * @throws {Error} if validation fails
 */
export function validateChecklist(checklist) {
  // Check required top-level keys
  const requiredKeys = [
    'job_metadata',
    'top_responsibilities',
    'must_haves',
    'nice_to_haves',
    'success_outcomes',
    'keyword_pack'
  ]

  for (const key of requiredKeys) {
    if (!(key in checklist)) {
      throw new Error(`Missing required key: ${key}`)
    }
  }

  // Validate job_metadata
  const metadata = checklist.job_metadata
  if (!metadata.job_title || typeof metadata.job_title !== 'string') {
    throw new Error('Invalid job_metadata.job_title')
  }
  if (!metadata.company_name || typeof metadata.company_name !== 'string') {
    throw new Error('Invalid job_metadata.company_name')
  }
  if (!Array.isArray(metadata.locations)) {
    throw new Error('Invalid job_metadata.locations (must be array)')
  }
  const validSeniorityLevels = ['intern', 'junior', 'mid', 'senior', 'lead', 'manager', 'director', 'unknown']
  if (!validSeniorityLevels.includes(metadata.seniority_level)) {
    throw new Error('Invalid job_metadata.seniority_level')
  }

  // Validate top_responsibilities
  if (!Array.isArray(checklist.top_responsibilities)) {
    throw new Error('top_responsibilities must be array')
  }
  if (checklist.top_responsibilities.length > 10) {
    throw new Error('top_responsibilities exceeds limit of 10')
  }
  for (const resp of checklist.top_responsibilities) {
    if (!resp.text || !resp.priority) {
      throw new Error('Invalid top_responsibilities entry')
    }
    if (!['must', 'high', 'medium', 'low'].includes(resp.priority)) {
      throw new Error('Invalid priority value')
    }
  }

  // Validate must_haves
  if (!checklist.must_haves.hard_skills || !Array.isArray(checklist.must_haves.hard_skills)) {
    throw new Error('must_haves.hard_skills must be array')
  }
  if (checklist.must_haves.hard_skills.length > 12) {
    throw new Error('must_haves.hard_skills exceeds limit of 12')
  }
  if (!checklist.must_haves.tools || !Array.isArray(checklist.must_haves.tools)) {
    throw new Error('must_haves.tools must be array')
  }
  if (checklist.must_haves.tools.length > 10) {
    throw new Error('must_haves.tools exceeds limit of 10')
  }

  // Validate nice_to_haves
  if (!checklist.nice_to_haves.hard_skills || !Array.isArray(checklist.nice_to_haves.hard_skills)) {
    throw new Error('nice_to_haves.hard_skills must be array')
  }
  if (checklist.nice_to_haves.hard_skills.length > 12) {
    throw new Error('nice_to_haves.hard_skills exceeds limit of 12')
  }
  if (!checklist.nice_to_haves.tools || !Array.isArray(checklist.nice_to_haves.tools)) {
    throw new Error('nice_to_haves.tools must be array')
  }
  if (checklist.nice_to_haves.tools.length > 10) {
    throw new Error('nice_to_haves.tools exceeds limit of 10')
  }

  // Validate success_outcomes
  if (!Array.isArray(checklist.success_outcomes)) {
    throw new Error('success_outcomes must be array')
  }
  if (checklist.success_outcomes.length > 6) {
    throw new Error('success_outcomes exceeds limit of 6')
  }

  // Validate keyword_pack
  if (!Array.isArray(checklist.keyword_pack.primary)) {
    throw new Error('keyword_pack.primary must be array')
  }
  if (checklist.keyword_pack.primary.length > 12) {
    throw new Error('keyword_pack.primary exceeds limit of 12')
  }
  if (!Array.isArray(checklist.keyword_pack.secondary)) {
    throw new Error('keyword_pack.secondary must be array')
  }
  if (checklist.keyword_pack.secondary.length > 20) {
    throw new Error('keyword_pack.secondary exceeds limit of 20')
  }
}
