/**
 * Prime Resume Adapter
 * Converts prime_bullets data into the resume_data JSON format
 * expected by the existing scoreAndSelectBullets() function.
 */

/**
 * Convert prime bullets array to resume_data JSON format
 * @param {Array} primeBullets - Array of prime_bullets rows from Supabase
 * @param {Object} summaryJson - Optional summary_json from prime_resumes (contact info, etc.)
 * @returns {Object} - Resume data shaped like { experience: [...], name, contact, etc. }
 */
export function primeBulletsToResumeJson(primeBullets, summaryJson = {}) {
  if (!primeBullets || primeBullets.length === 0) {
    return {
      name: summaryJson.name || '',
      contact: summaryJson.contact || {},
      experience: [],
      education: summaryJson.education || [],
      skills: summaryJson.skills || [],
    }
  }

  // Group bullets by company + role
  const experienceMap = new Map()

  primeBullets.forEach(bullet => {
    // Use company + role as key; handle nulls
    const company = bullet.company || 'Unknown Company'
    const role = bullet.role || 'Unknown Role'
    const key = `${company}|||${role}`

    if (!experienceMap.has(key)) {
      experienceMap.set(key, {
        company,
        title: role,
        location: '', // Prime bullets don't track location
        dates: formatDateRange(bullet.start_date, bullet.end_date),
        start_date: bullet.start_date,
        end_date: bullet.end_date,
        bullets: [],
      })
    }

    const exp = experienceMap.get(key)
    exp.bullets.push(bullet.bullet_text)

    // Update dates if this bullet has more complete date info
    if (bullet.start_date || bullet.end_date) {
      const currentStart = exp.start_date
      const currentEnd = exp.end_date

      // Use earliest start date
      if (bullet.start_date && (!currentStart || bullet.start_date < currentStart)) {
        exp.start_date = bullet.start_date
      }
      // Use latest end date
      if (bullet.end_date && (!currentEnd || bullet.end_date > currentEnd)) {
        exp.end_date = bullet.end_date
      }

      exp.dates = formatDateRange(exp.start_date, exp.end_date)
    }
  })

  // Convert map to array and sort by date (most recent first)
  const experience = Array.from(experienceMap.values())
    .map(exp => ({
      company: exp.company,
      title: exp.title,
      location: exp.location,
      dates: exp.dates,
      bullets: exp.bullets,
    }))
    .sort((a, b) => {
      // Sort by end_date descending (most recent first)
      // Use start_date as fallback
      const aDate = experienceMap.get(`${a.company}|||${a.title}`)?.end_date || 
                    experienceMap.get(`${a.company}|||${a.title}`)?.start_date || ''
      const bDate = experienceMap.get(`${b.company}|||${b.title}`)?.end_date || 
                    experienceMap.get(`${b.company}|||${b.title}`)?.start_date || ''
      
      if (!aDate && !bDate) return 0
      if (!aDate) return 1
      if (!bDate) return -1
      return bDate.localeCompare(aDate)
    })

  return {
    name: summaryJson.name || '',
    contact: summaryJson.contact || {},
    experience,
    education: summaryJson.education || [],
    skills: summaryJson.skills || [],
  }
}

/**
 * Format a date range for display
 * @param {string|null} startDate - ISO date string
 * @param {string|null} endDate - ISO date string
 * @returns {string} - Formatted date range like "Jan 2020 - Present"
 */
function formatDateRange(startDate, endDate) {
  if (!startDate && !endDate) return ''

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const month = date.toLocaleDateString('en-US', { month: 'short' })
    const year = date.getFullYear()
    return `${month} ${year}`
  }

  const start = formatDate(startDate)
  const end = endDate ? formatDate(endDate) : 'Present'

  if (start && end) {
    return `${start} - ${end}`
  }
  return start || end
}

/**
 * Extract all unique skills from prime bullets
 * @param {Array} primeBullets - Array of prime_bullets rows
 * @returns {Array} - Array of unique skills
 */
export function extractSkillsFromBullets(primeBullets) {
  const skills = new Set()
  primeBullets.forEach(bullet => {
    (bullet.skills || []).forEach(skill => skills.add(skill))
  })
  return Array.from(skills).sort()
}

/**
 * Extract all unique tags from prime bullets
 * @param {Array} primeBullets - Array of prime_bullets rows
 * @returns {Array} - Array of unique tags
 */
export function extractTagsFromBullets(primeBullets) {
  const tags = new Set()
  primeBullets.forEach(bullet => {
    (bullet.tags || []).forEach(tag => tags.add(tag))
  })
  return Array.from(tags).sort()
}

/**
 * Create a mapping from bullet_id (exp0_bullet0 format) to prime_bullet id
 * This is useful for tracking which prime bullets were selected/used
 * @param {Object} resumeJson - Resume JSON created by primeBulletsToResumeJson
 * @param {Array} primeBullets - Original prime_bullets array
 * @returns {Map} - Map from bullet_id to prime_bullet.id
 */
export function createBulletIdMapping(resumeJson, primeBullets) {
  const mapping = new Map()
  
  // Create a lookup from bullet_text to prime_bullet.id
  const textToId = new Map()
  primeBullets.forEach(pb => {
    textToId.set(pb.bullet_text, pb.id)
  })

  // Walk through the resume experience and create mappings
  resumeJson.experience.forEach((exp, expIdx) => {
    exp.bullets.forEach((bulletText, bulletIdx) => {
      const bulletId = `exp${expIdx}_bullet${bulletIdx}`
      const primeId = textToId.get(bulletText)
      if (primeId) {
        mapping.set(bulletId, primeId)
      }
    })
  })

  return mapping
}
