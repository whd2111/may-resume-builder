// Bullet Scoring & Selection Logic
// Deterministic function - no LLM calls
// Scores resume bullets based on job checklist and selects top candidates for tailoring

// Synonym mapping for better matching
const SYNONYM_MAP = {
  'a/b testing': ['experimentation', 'a/b test', 'testing', 'experiments'],
  'experimentation': ['a/b testing', 'a/b test', 'testing'],
  'gtm': ['go-to-market', 'go to market'],
  'go-to-market': ['gtm', 'go to market'],
  'stakeholder management': ['cross-functional collaboration', 'cross functional', 'stakeholder'],
  'cross-functional collaboration': ['stakeholder management', 'cross functional', 'stakeholder'],
  'financial modeling': ['modeling', 'scenario analysis', 'financial analysis'],
  'modeling': ['financial modeling', 'scenario analysis'],
  'python': ['py', 'python3'],
  'javascript': ['js', 'node', 'nodejs', 'node.js'],
  'typescript': ['ts'],
  'sql': ['postgres', 'mysql', 'database'],
  'machine learning': ['ml', 'ai', 'artificial intelligence'],
  'product management': ['pm', 'product manager'],
  'data analysis': ['analytics', 'data analytics'],
}

// Fluff phrases that reduce score
const FLUFF_PHRASES = [
  'responsible for',
  'worked on',
  'helped with',
  'assisted with',
  'various tasks',
  'duties included',
  'involved in',
  'participated in',
  'contributed to',
]

/**
 * Generate stable bullet ID from experience index and bullet index
 * @param {number} expIndex - Experience array index
 * @param {number} bulletIndex - Bullet array index
 * @returns {string} - Stable bullet ID
 */
function generateBulletId(expIndex, bulletIndex) {
  return `exp${expIndex}_bullet${bulletIndex}`
}

/**
 * Parse resume to extract all bullets with stable IDs
 * @param {Object} resume_json - Resume data structure
 * @returns {Array} - Array of bullet objects with IDs
 */
function extractBulletsWithIds(resume_json) {
  const bullets = []
  
  if (!resume_json.experience || !Array.isArray(resume_json.experience)) {
    return bullets
  }

  resume_json.experience.forEach((exp, expIndex) => {
    if (!exp.bullets || !Array.isArray(exp.bullets)) {
      return
    }

    exp.bullets.forEach((bulletText, bulletIndex) => {
      bullets.push({
        bullet_id: generateBulletId(expIndex, bulletIndex),
        experience_id: expIndex,
        bullet_index: bulletIndex,
        original_text: bulletText,
        company: exp.company,
        title: exp.title,
      })
    })
  })

  return bullets
}

/**
 * Normalize text for matching (lowercase, trim)
 * @param {string} text
 * @returns {string}
 */
function normalizeText(text) {
  return text.toLowerCase().trim()
}

/**
 * Check if text contains term or its synonyms
 * @param {string} text - Text to search in
 * @param {string} term - Term to search for
 * @returns {boolean}
 */
function matchesTermWithSynonyms(text, term) {
  const normalizedText = normalizeText(text)
  const normalizedTerm = normalizeText(term)

  // Direct match
  if (normalizedText.includes(normalizedTerm)) {
    return true
  }

  // Synonym match
  const synonyms = SYNONYM_MAP[normalizedTerm] || []
  return synonyms.some(syn => normalizedText.includes(normalizeText(syn)))
}

/**
 * Count how many fluff phrases appear in text
 * @param {string} text
 * @returns {number}
 */
function countFluffPhrases(text) {
  const normalizedText = normalizeText(text)
  return FLUFF_PHRASES.filter(phrase => normalizedText.includes(phrase)).length
}

/**
 * Score a single bullet against the checklist
 * @param {Object} bullet - Bullet object with original_text
 * @param {Object} checklist - Job checklist JSON
 * @returns {Object} - Score details
 */
function scoreBullet(bullet, checklist) {
  let score = 0
  const matchedTerms = []
  const reasons = []

  const bulletText = bullet.original_text

  // Check must_haves tools (+5 each)
  const mustHaveTools = checklist.must_haves.tools || []
  mustHaveTools.forEach(tool => {
    if (matchesTermWithSynonyms(bulletText, tool)) {
      score += 5
      matchedTerms.push(`tool: ${tool}`)
      reasons.push(`Must-have tool: ${tool}`)
    }
  })

  // Check must_haves hard skills (+5 each)
  const mustHaveSkills = checklist.must_haves.hard_skills || []
  mustHaveSkills.forEach(skill => {
    if (matchesTermWithSynonyms(bulletText, skill)) {
      score += 5
      matchedTerms.push(`skill: ${skill}`)
      reasons.push(`Must-have skill: ${skill}`)
    }
  })

  // Check top_responsibilities (+3 for keyword overlap)
  const topResponsibilities = checklist.top_responsibilities || []
  topResponsibilities.forEach(resp => {
    // Extract key words from responsibility (split on common words)
    const respWords = resp.text.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    const matchCount = respWords.filter(word => 
      normalizeText(bulletText).includes(word)
    ).length

    if (matchCount >= 2) { // At least 2 word matches
      score += 3
      matchedTerms.push(`responsibility: ${resp.text.substring(0, 30)}...`)
      reasons.push(`Matches responsibility: ${resp.text.substring(0, 50)}...`)
    }
  })

  // Check keyword_pack.primary (+2 each)
  const primaryKeywords = checklist.keyword_pack.primary || []
  primaryKeywords.forEach(keyword => {
    if (matchesTermWithSynonyms(bulletText, keyword)) {
      score += 2
      matchedTerms.push(`primary: ${keyword}`)
      reasons.push(`Primary keyword: ${keyword}`)
    }
  })

  // Check keyword_pack.secondary (+1 each)
  const secondaryKeywords = checklist.keyword_pack.secondary || []
  secondaryKeywords.forEach(keyword => {
    if (matchesTermWithSynonyms(bulletText, keyword)) {
      score += 1
      matchedTerms.push(`secondary: ${keyword}`)
      reasons.push(`Secondary keyword: ${keyword}`)
    }
  })

  // Penalize fluff phrases (-3 per phrase)
  const fluffCount = countFluffPhrases(bulletText)
  if (fluffCount > 0) {
    score -= fluffCount * 3
    reasons.push(`Fluff penalty: -${fluffCount * 3}`)
  }

  // Penalize if no overlap at all (-2)
  if (matchedTerms.length === 0) {
    score -= 2
    reasons.push('No relevant matches: -2')
  }

  return {
    score,
    matched_terms: matchedTerms,
    reason: reasons.join('; ')
  }
}

/**
 * Greedy coverage selection - prioritize bullets that cover uncovered must-haves
 * @param {Array} scoredBullets - Array of bullets with scores
 * @param {Object} checklist - Job checklist
 * @param {number} maxBullets - Maximum bullets to select
 * @returns {Array} - Selected bullet IDs in order
 */
function selectBulletsWithCoverage(scoredBullets, checklist, maxBullets = 12) {
  const allMustHaves = [
    ...(checklist.must_haves.tools || []),
    ...(checklist.must_haves.hard_skills || [])
  ]

  const coveredMustHaves = new Set()
  const selectedBullets = []

  // Sort by score descending
  const sortedBullets = [...scoredBullets].sort((a, b) => b.score - a.score)

  // Greedy selection: prioritize bullets that cover new must-haves
  for (const bullet of sortedBullets) {
    if (selectedBullets.length >= maxBullets) {
      break
    }

    // Check which must-haves this bullet covers
    const newCoverage = allMustHaves.filter(term => 
      !coveredMustHaves.has(term) && 
      matchesTermWithSynonyms(bullet.original_text, term)
    )

    // Select if it has good score OR covers new must-haves
    if (bullet.score > 0 || newCoverage.length > 0) {
      selectedBullets.push(bullet)
      newCoverage.forEach(term => coveredMustHaves.add(term))
    }
  }

  // If we haven't hit maxBullets, fill with remaining high-score bullets
  for (const bullet of sortedBullets) {
    if (selectedBullets.length >= maxBullets) {
      break
    }
    if (!selectedBullets.find(b => b.bullet_id === bullet.bullet_id)) {
      selectedBullets.push(bullet)
    }
  }

  return {
    selectedBullets: selectedBullets.slice(0, maxBullets),
    coveredMustHaves: Array.from(coveredMustHaves),
    missingMustHaves: allMustHaves.filter(term => !coveredMustHaves.has(term))
  }
}

/**
 * Main function: Score and select bullets
 * @param {Object} resume_json - Resume data structure
 * @param {Object} checklist_json - Job checklist
 * @returns {Object} - Selection JSON with selected bullets and coverage report
 */
export function scoreAndSelectBullets(resume_json, checklist_json) {
  // Extract all bullets with stable IDs
  const bullets = extractBulletsWithIds(resume_json)

  if (bullets.length === 0) {
    throw new Error('No bullets found in resume')
  }

  // Score each bullet
  const scoredBullets = bullets.map(bullet => {
    const scoreDetails = scoreBullet(bullet, checklist_json)
    return {
      ...bullet,
      ...scoreDetails
    }
  })

  // Select bullets with coverage optimization
  const { selectedBullets, coveredMustHaves, missingMustHaves } = 
    selectBulletsWithCoverage(scoredBullets, checklist_json, 12)

  // Prepare output
  const selection_json = {
    selected_bullets: selectedBullets.map(b => ({
      bullet_id: b.bullet_id,
      experience_id: b.experience_id,
      original_text: b.original_text,
      score: b.score,
      matched_terms: b.matched_terms,
      reason: b.reason
    })),
    ordering: selectedBullets.map(b => b.bullet_id),
    coverage_report: {
      covered_must_haves: coveredMustHaves,
      missing_must_haves: missingMustHaves
    }
  }

  return selection_json
}

/**
 * Helper to get bullet by ID from resume
 * @param {Object} resume_json
 * @param {string} bullet_id
 * @returns {Object|null}
 */
export function getBulletById(resume_json, bullet_id) {
  const bullets = extractBulletsWithIds(resume_json)
  return bullets.find(b => b.bullet_id === bullet_id) || null
}
