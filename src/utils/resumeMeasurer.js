// Resume Measurement & Compression Utilities
// Ensures resumes fit exactly one page through render → measure → compress loop

const US_LETTER_HEIGHT_INCHES = 11
const US_LETTER_WIDTH_INCHES = 8.5
const DPI = 96 // Standard screen DPI
const PAGE_HEIGHT_PX = US_LETTER_HEIGHT_INCHES * DPI // ~1056px
const MARGIN_TOP_PX = 0.5 * DPI // 48px
const MARGIN_BOTTOM_PX = 0.5 * DPI // 48px
const CONTENT_HEIGHT_PX = PAGE_HEIGHT_PX - MARGIN_TOP_PX - MARGIN_BOTTOM_PX // ~960px

/**
 * Measure the height of resume content when rendered
 * @param {Object} resumeData - Resume data structure
 * @returns {number} - Estimated height in pixels
 */
export function measureResumeHeight(resumeData) {
  // Create a hidden div to render the content
  const measureDiv = document.createElement('div')
  measureDiv.style.cssText = `
    position: absolute;
    left: -9999px;
    width: ${8.5 * DPI - 2 * 0.5 * DPI}px;
    font-family: 'Times New Roman', serif;
    font-size: 10pt;
    line-height: 1.2;
  `
  
  document.body.appendChild(measureDiv)
  
  try {
    // Render resume content
    measureDiv.innerHTML = renderResumeHTML(resumeData)
    
    // Get actual height
    const height = measureDiv.offsetHeight
    
    return height
  } finally {
    // Clean up
    document.body.removeChild(measureDiv)
  }
}

/**
 * Render resume as HTML for measurement
 * This should match the DOCX styling as closely as possible
 */
function renderResumeHTML(resumeData) {
  let html = ''
  
  // Header: Name
  html += `<div style="text-align: right; font-size: 12pt; font-weight: bold; margin-bottom: 4px;">
    ${escapeHTML(resumeData.name.toUpperCase())}
  </div>`
  
  // Contact
  html += `<div style="text-align: right; font-size: 10pt; margin-bottom: 12px;">
    ${escapeHTML(resumeData.contact.phone)} | ${escapeHTML(resumeData.contact.email)}
  </div>`
  
  // Education Section
  html += `<div style="font-weight: bold; border-bottom: 1px solid black; margin-top: 12px; margin-bottom: 6px;">
    EDUCATION
  </div>`
  
  if (resumeData.education) {
    resumeData.education.forEach(edu => {
      html += `<div style="margin-top: 8px;">
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 11pt;">
          <span>${escapeHTML(edu.institution.toUpperCase())}</span>
          <span>${escapeHTML(edu.location)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11pt; margin-bottom: 4px;">
          <span>${escapeHTML(edu.degree)}</span>
          <span>${escapeHTML(edu.dates)}</span>
        </div>`
      
      if (edu.details) {
        html += `<div style="font-style: italic; font-size: 11pt; margin-bottom: 10px;">
          ${escapeHTML(edu.details)}
        </div>`
      }
      
      html += `</div>`
    })
  }
  
  // Experience Section
  html += `<div style="font-weight: bold; border-bottom: 1px solid black; margin-top: 12px; margin-bottom: 6px;">
    EXPERIENCE
  </div>`
  
  if (resumeData.experience) {
    resumeData.experience.forEach(exp => {
      html += `<div style="margin-top: 8px;">
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 11pt;">
          <span>${escapeHTML(exp.company.toUpperCase())}</span>
          <span>${escapeHTML(exp.location)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-style: italic; font-size: 11pt; margin-bottom: 8px;">
          <span>${escapeHTML(exp.title)}</span>
          <span>${escapeHTML(exp.dates)}</span>
        </div>`
      
      if (exp.bullets && exp.bullets.length > 0) {
        html += `<ul style="margin: 0; padding-left: 20px; margin-bottom: 8px;">`
        exp.bullets.forEach(bullet => {
          html += `<li style="margin-bottom: 4px; font-size: 10pt;">${escapeHTML(bullet)}</li>`
        })
        html += `</ul>`
      }
      
      html += `</div>`
    })
  }
  
  // Skills Section
  if (resumeData.skills) {
    html += `<div style="font-weight: bold; border-bottom: 1px solid black; margin-top: 16px; margin-bottom: 8px;">
      ADDITIONAL INFORMATION
    </div>`
    html += `<div style="font-size: 11pt; margin-bottom: 8px;">
      <span style="font-weight: bold;">Technical &amp; Software: </span>${escapeHTML(resumeData.skills)}
    </div>`
  }
  
  return html
}

/**
 * Check if resume fits on one page
 * @param {Object} resumeData - Resume data structure
 * @returns {boolean} - True if fits on one page
 */
export function fitsOnOnePage(resumeData) {
  const height = measureResumeHeight(resumeData)
  return height <= CONTENT_HEIGHT_PX
}

/**
 * Compress resume to fit on one page
 * Uses deterministic trimming based on priority
 * @param {Object} resumeData - Resume data structure
 * @param {number} currentHeight - Current measured height in pixels
 * @returns {Object} - Compressed resume data
 */
export function compressResume(resumeData, currentHeight) {
  const compressed = JSON.parse(JSON.stringify(resumeData)) // Deep clone
  
  const overage = currentHeight - CONTENT_HEIGHT_PX
  const compressionNeeded = overage / currentHeight // Percentage to remove
  
  console.log(`Compression needed: ${(compressionNeeded * 100).toFixed(1)}% (${overage}px over)`)
  
  // Strategy 1: Remove bullets from oldest experiences first
  if (compressed.experience && compressed.experience.length > 0) {
    // Start from the last (oldest) experience
    for (let i = compressed.experience.length - 1; i >= 0; i--) {
      const exp = compressed.experience[i]
      
      if (exp.bullets && exp.bullets.length > 0) {
        // Remove bullets one at a time from oldest experiences
        const bulletsToRemove = Math.max(1, Math.ceil(exp.bullets.length * compressionNeeded))
        
        // Remove last bullets (usually less important)
        const removed = exp.bullets.splice(-bulletsToRemove)
        console.log(`Removed ${removed.length} bullet(s) from ${exp.company}`)
        
        // Check if we've compressed enough
        const newHeight = measureResumeHeight(compressed)
        if (newHeight <= CONTENT_HEIGHT_PX) {
          return compressed
        }
      }
    }
  }
  
  // Strategy 2: Trim skills section if still over
  if (compressed.skills && compressed.skills.length > 100) {
    const maxSkillsLength = Math.floor(compressed.skills.length * 0.7)
    compressed.skills = compressed.skills.substring(0, maxSkillsLength).trim() + '...'
    console.log('Trimmed skills section')
    
    const newHeight = measureResumeHeight(compressed)
    if (newHeight <= CONTENT_HEIGHT_PX) {
      return compressed
    }
  }
  
  // Strategy 3: Remove education details
  if (compressed.education) {
    compressed.education.forEach(edu => {
      if (edu.details) {
        delete edu.details
        console.log('Removed education details')
      }
    })
    
    const newHeight = measureResumeHeight(compressed)
    if (newHeight <= CONTENT_HEIGHT_PX) {
      return compressed
    }
  }
  
  // Strategy 4: More aggressive bullet removal
  if (compressed.experience && compressed.experience.length > 0) {
    for (let i = compressed.experience.length - 1; i >= 0; i--) {
      const exp = compressed.experience[i]
      
      if (exp.bullets && exp.bullets.length > 2) {
        // Keep only top 2 bullets for older experiences
        exp.bullets = exp.bullets.slice(0, 2)
        console.log(`Kept only 2 bullets for ${exp.company}`)
        
        const newHeight = measureResumeHeight(compressed)
        if (newHeight <= CONTENT_HEIGHT_PX) {
          return compressed
        }
      }
    }
  }
  
  return compressed
}

/**
 * Ensure resume fits on one page using render → measure → compress loop
 * @param {Object} resumeData - Resume data structure
 * @param {number} maxIterations - Maximum compression attempts
 * @returns {Object} - Final resume data guaranteed to fit one page
 */
export async function ensureOnePage(resumeData, maxIterations = 3) {
  let currentData = JSON.parse(JSON.stringify(resumeData)) // Deep clone
  
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const height = measureResumeHeight(currentData)
    const pageCount = Math.ceil(height / CONTENT_HEIGHT_PX)
    
    console.log(`Iteration ${iteration + 1}: Height = ${height}px, Pages = ${pageCount}`)
    
    if (height <= CONTENT_HEIGHT_PX) {
      console.log('✓ Resume fits on one page!')
      return currentData
    }
    
    // Compress
    currentData = compressResume(currentData, height)
  }
  
  // Final check - if still over, do aggressive trim
  const finalHeight = measureResumeHeight(currentData)
  if (finalHeight > CONTENT_HEIGHT_PX) {
    console.warn('⚠️ Still over one page after max iterations, doing aggressive trim')
    currentData = aggressiveTrim(currentData)
  }
  
  return currentData
}

/**
 * Aggressive trim as last resort
 * @param {Object} resumeData - Resume data structure
 * @returns {Object} - Aggressively trimmed resume
 */
function aggressiveTrim(resumeData) {
  const trimmed = JSON.parse(JSON.stringify(resumeData))
  
  // Keep only most recent 3 experiences
  if (trimmed.experience && trimmed.experience.length > 3) {
    trimmed.experience = trimmed.experience.slice(0, 3)
  }
  
  // Keep only top 2 bullets per experience
  if (trimmed.experience) {
    trimmed.experience.forEach(exp => {
      if (exp.bullets && exp.bullets.length > 2) {
        exp.bullets = exp.bullets.slice(0, 2)
      }
    })
  }
  
  // Trim skills to 80 chars
  if (trimmed.skills && trimmed.skills.length > 80) {
    trimmed.skills = trimmed.skills.substring(0, 77) + '...'
  }
  
  // Remove education details
  if (trimmed.education) {
    trimmed.education.forEach(edu => delete edu.details)
  }
  
  return trimmed
}

/**
 * Escape HTML special characters
 */
function escapeHTML(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
