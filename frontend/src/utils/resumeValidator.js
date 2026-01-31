// Resume Data Validation
// Detects broken output, placeholders, and formatting issues before rendering

const PLACEHOLDER_PATTERNS = [
  /\[ADD [^\]]*\]/i,           // [ADD NUMBER], [ADD %], etc.
  /\bADD\b.*\d/i,              // "ADD 5", "ADD NUMBER", etc.
  /\d+\.\s+\d+/,               // "1. 10 programs, 2. dollars" pattern
  /don't have/i,               // "I don't have data"
  /let's not/i,                // "let's not do it"
  /not \d+% sure/i,            // "not 100% sure"
  /maybe|uncertain|unclear/i,  // Uncertainty markers
  /__+/,                       // Underscores like "__2_"
]

const FORMATTING_ISSUES = [
  {
    pattern: /for \d+\.\s+\d+/,
    message: 'Numbered list detected in prose (e.g., "for 1. 10 programs")'
  },
  {
    pattern: /\d+\.\s+\d+\s+[a-z]/i,
    message: 'Numbered list detected (e.g., "1. 10 programs, 2. dollars")'
  }
]

/**
 * Validate resume data for broken output and placeholders
 * @param {Object} resumeData - Resume data structure
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export function validateResumeData(resumeData) {
  const errors = []
  
  if (!resumeData) {
    return { valid: false, errors: ['Resume data is null or undefined'] }
  }
  
  // Check experience bullets
  if (resumeData.experience) {
    resumeData.experience.forEach((exp, expIdx) => {
      if (exp.bullets) {
        exp.bullets.forEach((bullet, bulletIdx) => {
          const bulletErrors = validateBullet(bullet, `${exp.company} - Bullet ${bulletIdx + 1}`)
          errors.push(...bulletErrors)
        })
      }
    })
  }
  
  // Check education details
  if (resumeData.education) {
    resumeData.education.forEach((edu, eduIdx) => {
      if (edu.details) {
        const detailErrors = validateText(edu.details, `Education ${eduIdx + 1} - Details`)
        errors.push(...detailErrors)
      }
    })
  }
  
  // Check skills
  if (resumeData.skills) {
    const skillErrors = validateText(resumeData.skills, 'Skills section')
    errors.push(...skillErrors)
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate a single bullet point
 * @param {string} bullet - Bullet text
 * @param {string} location - Location identifier for error messages
 * @returns {string[]} - Array of error messages
 */
function validateBullet(bullet, location) {
  const errors = []
  
  if (!bullet || typeof bullet !== 'string') {
    errors.push(`${location}: Bullet is empty or not a string`)
    return errors
  }
  
  // Check for placeholders
  PLACEHOLDER_PATTERNS.forEach(pattern => {
    if (pattern.test(bullet)) {
      errors.push(`${location}: Contains placeholder or broken text - "${bullet.substring(0, 100)}..."`)
    }
  })
  
  // Check for formatting issues
  FORMATTING_ISSUES.forEach(({ pattern, message }) => {
    if (pattern.test(bullet)) {
      errors.push(`${location}: ${message} - "${bullet.substring(0, 100)}..."`)
    }
  })
  
  // Check for incomplete sentences (ends with numbers or weird punctuation)
  if (/\d+\s*$/.test(bullet.trim())) {
    errors.push(`${location}: Bullet ends with incomplete number - "${bullet}"`)
  }
  
  return errors
}

/**
 * Validate general text content
 * @param {string} text - Text to validate
 * @param {string} location - Location identifier for error messages
 * @returns {string[]} - Array of error messages
 */
function validateText(text, location) {
  const errors = []
  
  if (!text || typeof text !== 'string') {
    return errors // Empty is okay for optional fields
  }
  
  // Check for placeholders
  PLACEHOLDER_PATTERNS.forEach(pattern => {
    if (pattern.test(text)) {
      errors.push(`${location}: Contains placeholder or broken text - "${text.substring(0, 100)}..."`)
    }
  })
  
  return errors
}

/**
 * Auto-fix common issues (best effort)
 * @param {Object} resumeData - Resume data structure
 * @returns {Object} - Cleaned resume data
 */
export function autoFixResumeData(resumeData) {
  if (!resumeData) return resumeData
  
  const fixed = JSON.parse(JSON.stringify(resumeData)) // Deep clone
  
  // Fix experience bullets
  if (fixed.experience) {
    fixed.experience.forEach(exp => {
      if (exp.bullets) {
        exp.bullets = exp.bullets.map(bullet => cleanBullet(bullet))
      }
    })
  }
  
  // Fix education details
  if (fixed.education) {
    fixed.education.forEach(edu => {
      if (edu.details) {
        edu.details = cleanText(edu.details)
      }
    })
  }
  
  // Fix skills
  if (fixed.skills) {
    fixed.skills = cleanText(fixed.skills)
  }
  
  return fixed
}

/**
 * Clean a bullet point (remove obvious broken patterns)
 * @param {string} bullet - Bullet text
 * @returns {string} - Cleaned bullet
 */
function cleanBullet(bullet) {
  if (!bullet || typeof bullet !== 'string') return bullet
  
  let cleaned = bullet
  
  // Remove placeholder brackets
  cleaned = cleaned.replace(/\[ADD [^\]]*\]/gi, '')
  
  // Remove internal thoughts
  cleaned = cleaned.replace(/I don't have.*?(?=\.|$)/gi, '')
  cleaned = cleaned.replace(/let's not.*?(?=\.|$)/gi, '')
  cleaned = cleaned.replace(/not \d+% sure.*?(?=\.|$)/gi, '')
  
  // Remove underscores
  cleaned = cleaned.replace(/__+\d*_*/g, '')
  
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim()
  
  // If cleaning made it too short or empty, return original
  if (cleaned.length < 20) {
    return bullet
  }
  
  return cleaned
}

/**
 * Clean general text
 * @param {string} text - Text to clean
 * @returns {string} - Cleaned text
 */
function cleanText(text) {
  if (!text || typeof text !== 'string') return text
  
  let cleaned = text
  
  // Remove placeholder brackets
  cleaned = cleaned.replace(/\[ADD [^\]]*\]/gi, '')
  
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim()
  
  return cleaned
}

/**
 * Log validation errors to console with clear formatting
 * @param {Object} validationResult - Result from validateResumeData
 */
export function logValidationErrors(validationResult) {
  if (validationResult.valid) {
    console.log('✅ Resume validation passed - no issues detected')
    return
  }
  
  console.error('❌ Resume validation FAILED - Issues detected:')
  console.error('━'.repeat(80))
  validationResult.errors.forEach((error, idx) => {
    console.error(`${idx + 1}. ${error}`)
  })
  console.error('━'.repeat(80))
  console.error(`Total issues: ${validationResult.errors.length}`)
}
