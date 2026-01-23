// Resume Measurement Utilities
// 
// IMPORTANT: The PageFit system now handles layout-only fitting.
// This file provides measurement functions that support variable layout parameters.
// Content modification functions (compressResume, etc.) are DEPRECATED and kept
// only for backwards compatibility. New code should use PageFit instead.

import { 
  LAYOUT_BOUNDS, 
  getDefaultLayoutVars,
  calculateCharCount,
} from '../pageFit/pageFitConfig.js'

const US_LETTER_HEIGHT_INCHES = 11
const US_LETTER_WIDTH_INCHES = 8.5
const DPI = 96 // Standard screen DPI
const PAGE_HEIGHT_PX = US_LETTER_HEIGHT_INCHES * DPI // ~1056px
const MARGIN_TOP_PX = 0.5 * DPI // 48px
const MARGIN_BOTTOM_PX = 0.5 * DPI // 48px
const CONTENT_HEIGHT_PX_RAW = PAGE_HEIGHT_PX - MARGIN_TOP_PX - MARGIN_BOTTOM_PX // ~960px
// Apply 5% safety margin to account for DOCX rendering differences
const SAFETY_MARGIN = 0.95
const CONTENT_HEIGHT_PX = Math.floor(CONTENT_HEIGHT_PX_RAW * SAFETY_MARGIN) // ~912px

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
 * Measure resume height with specific layout variables
 * Used by PageFit to measure content with different layout settings
 * 
 * @param {Object} resumeData - Resume data structure (READ-ONLY)
 * @param {Object} layoutVars - Layout variables from PageFit
 * @returns {number} - Estimated height in pixels
 */
export function measureResumeHeightWithVars(resumeData, layoutVars) {
  // Calculate width based on margins
  const marginPx = (layoutVars.margins / 1440) * DPI
  const contentWidth = (8.5 * DPI) - (marginPx * 2)
  
  // Convert font sizes from half-points to pt
  const bodyFontPt = layoutVars.bodyFontSize / 2
  const nameFontPt = layoutVars.nameFontSize / 2
  const sectionHeaderFontPt = layoutVars.sectionHeaderFontSize / 2
  
  // Convert line height from TWIPs to multiplier (240 = 1.0)
  const lineHeightMultiplier = layoutVars.lineHeight / 240
  
  // Create a hidden div to render the content
  const measureDiv = document.createElement('div')
  measureDiv.style.cssText = `
    position: absolute;
    left: -9999px;
    width: ${contentWidth}px;
    font-family: 'Times New Roman', serif;
    font-size: ${bodyFontPt}pt;
    line-height: ${lineHeightMultiplier};
  `
  
  document.body.appendChild(measureDiv)
  
  try {
    // Render resume content with layout-aware HTML
    measureDiv.innerHTML = renderResumeHTMLWithVars(resumeData, {
      bodyFontPt,
      nameFontPt,
      sectionHeaderFontPt,
      lineHeightMultiplier,
      sectionSpacingBeforePx: (layoutVars.sectionSpacingBefore / 20) * 1.333, // TWIPs to px
      sectionSpacingAfterPx: (layoutVars.sectionSpacingAfter / 20) * 1.333,
      roleGapPx: (layoutVars.roleGap / 20) * 1.333,
      bulletSpacingPx: (layoutVars.bulletSpacing / 20) * 1.333,
      contactSpacingAfterPx: (layoutVars.contactSpacingAfter / 20) * 1.333,
      nameSpacingAfterPx: (layoutVars.nameSpacingAfter / 20) * 1.333,
    })
    
    // Get actual height
    const height = measureDiv.offsetHeight
    
    return height
  } finally {
    // Clean up
    document.body.removeChild(measureDiv)
  }
}

/**
 * Render resume as HTML with specific layout variables for measurement
 * This mirrors the DOCX output structure but uses layout vars for accurate measurement
 */
function renderResumeHTMLWithVars(resumeData, layoutVars) {
  const {
    bodyFontPt,
    nameFontPt,
    sectionHeaderFontPt,
    lineHeightMultiplier,
    sectionSpacingBeforePx,
    sectionSpacingAfterPx,
    roleGapPx,
    bulletSpacingPx,
    contactSpacingAfterPx,
    nameSpacingAfterPx,
  } = layoutVars
  
  let html = ''
  
  // Header: Name
  html += `<div style="text-align: center; font-size: ${nameFontPt}pt; font-weight: bold; margin-bottom: ${nameSpacingAfterPx}px; line-height: ${lineHeightMultiplier};">
    ${escapeHTML(toTitleCase(resumeData.name))}
  </div>`
  
  // Contact
  const contactParts = [
    resumeData.contact?.phone,
    resumeData.contact?.email,
    resumeData.contact?.linkedin
  ].filter(Boolean)
  
  if (contactParts.length > 0) {
    html += `<div style="text-align: center; font-size: ${bodyFontPt}pt; margin-bottom: ${contactSpacingAfterPx}px; line-height: ${lineHeightMultiplier};">
      ${escapeHTML(contactParts.join(' | '))}
    </div>`
  }
  
  // Summary Section
  if (resumeData.summary) {
    html += `<div style="font-weight: bold; border-bottom: 1px solid black; margin-top: ${sectionSpacingBeforePx}px; margin-bottom: ${sectionSpacingAfterPx}px; font-size: ${sectionHeaderFontPt}pt;">
      SUMMARY
    </div>`
    html += `<div style="font-size: ${bodyFontPt}pt; margin-bottom: ${roleGapPx}px; text-align: justify; line-height: ${lineHeightMultiplier};">
      ${escapeHTML(resumeData.summary)}
    </div>`
  }
  
  // Education Section
  if (resumeData.education && resumeData.education.length > 0) {
    html += `<div style="font-weight: bold; border-bottom: 1px solid black; margin-top: ${sectionSpacingBeforePx}px; margin-bottom: ${sectionSpacingAfterPx}px; font-size: ${sectionHeaderFontPt}pt;">
      EDUCATION
    </div>`
    
    resumeData.education.forEach(edu => {
      html += `<div style="margin-top: ${roleGapPx / 2}px;">
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: ${bodyFontPt}pt; line-height: ${lineHeightMultiplier};">
          <span>${escapeHTML((edu.institution || '').toUpperCase())}</span>
          <span style="font-weight: normal;">${escapeHTML(edu.dates || '')}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: ${bodyFontPt}pt; line-height: ${lineHeightMultiplier};">
          <span>${escapeHTML(edu.degree || '')}</span>
          <span style="font-style: italic;">${escapeHTML(edu.location || '')}</span>
        </div>`
      
      // GPA field (new)
      if (edu.gpa) {
        html += `<div style="font-size: ${bodyFontPt}pt; line-height: ${lineHeightMultiplier};">
          <strong>GPA:</strong> ${escapeHTML(edu.gpa)}
        </div>`
      }
      
      if (edu.details) {
        html += `<div style="font-style: italic; font-size: ${bodyFontPt}pt; margin-bottom: ${roleGapPx / 2}px; line-height: ${lineHeightMultiplier};">
          ${escapeHTML(edu.details)}
        </div>`
      }
      
      html += `</div>`
    })
  }
  
  // Experience Section
  if (resumeData.experience && resumeData.experience.length > 0) {
    html += `<div style="font-weight: bold; border-bottom: 1px solid black; margin-top: ${sectionSpacingBeforePx}px; margin-bottom: ${sectionSpacingAfterPx}px; font-size: ${sectionHeaderFontPt}pt;">
      EXPERIENCE
    </div>`
    
    resumeData.experience.forEach(exp => {
      html += `<div style="margin-top: ${roleGapPx / 2}px;">
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: ${bodyFontPt}pt; line-height: ${lineHeightMultiplier};">
          <span>${escapeHTML((exp.company || '').toUpperCase())}</span>
          <span style="font-weight: normal;">${escapeHTML(exp.dates || '')}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: ${bodyFontPt}pt; font-style: italic; line-height: ${lineHeightMultiplier};">
          <span>${escapeHTML(exp.title || '')}</span>
          <span style="font-style: normal;">${escapeHTML(exp.location || '')}</span>
        </div>`
      
      if (exp.bullets && exp.bullets.length > 0) {
        html += `<ul style="margin: 0; padding-left: 18px; margin-top: 0; margin-bottom: ${roleGapPx}px;">`
        exp.bullets.forEach((bullet, idx) => {
          const isLast = idx === exp.bullets.length - 1
          html += `<li style="margin-bottom: ${isLast ? 0 : bulletSpacingPx}px; font-size: ${bodyFontPt}pt; line-height: ${lineHeightMultiplier};">${escapeHTML(bullet)}</li>`
        })
        html += `</ul>`
      }
      
      html += `</div>`
    })
  }
  
  // Skills Section
  if (resumeData.skills) {
    html += `<div style="font-weight: bold; border-bottom: 1px solid black; margin-top: ${sectionSpacingBeforePx}px; margin-bottom: ${sectionSpacingAfterPx}px; font-size: ${sectionHeaderFontPt}pt;">
      SKILLS
    </div>`
    html += `<div style="font-size: ${bodyFontPt}pt; margin-bottom: ${roleGapPx}px; line-height: ${lineHeightMultiplier};">
      ${escapeHTML(resumeData.skills)}
    </div>`
  }
  
  // Additional Section
  if (resumeData.additional) {
    html += `<div style="font-weight: bold; border-bottom: 1px solid black; margin-top: ${sectionSpacingBeforePx}px; margin-bottom: ${sectionSpacingAfterPx}px; font-size: ${sectionHeaderFontPt}pt;">
      ADDITIONAL
    </div>`
    html += `<div style="font-size: ${bodyFontPt}pt; margin-bottom: ${roleGapPx}px; line-height: ${lineHeightMultiplier};">
      ${escapeHTML(resumeData.additional)}
    </div>`
  }
  
  // Custom Sections
  if (resumeData.custom_sections && resumeData.custom_sections.length > 0) {
    resumeData.custom_sections.forEach(section => {
      html += `<div style="font-weight: bold; border-bottom: 1px solid black; margin-top: ${sectionSpacingBeforePx}px; margin-bottom: ${sectionSpacingAfterPx}px; font-size: ${sectionHeaderFontPt}pt;">
        ${escapeHTML((section.title || '').toUpperCase())}
      </div>`
      
      if (section.content && section.content.length > 0) {
        const isCompact = section.content.every(item => item.length < 80) && section.content.length <= 4
        
        if (isCompact) {
          html += `<div style="font-size: ${bodyFontPt}pt; margin-bottom: ${roleGapPx}px; line-height: ${lineHeightMultiplier};">
            ${escapeHTML(section.content.join(' • '))}
          </div>`
        } else {
          html += `<ul style="margin: 0; padding-left: 18px; margin-bottom: ${roleGapPx}px;">`
          section.content.forEach((item, idx) => {
            const isLast = idx === section.content.length - 1
            html += `<li style="margin-bottom: ${isLast ? 0 : bulletSpacingPx}px; font-size: ${bodyFontPt}pt; line-height: ${lineHeightMultiplier};">${escapeHTML(item)}</li>`
          })
          html += `</ul>`
        }
      }
    })
  }
  
  return html
}

/**
 * Render resume as HTML for measurement
 * This should match the DOCX styling as closely as possible
 * IMPORTANT: Must include ALL sections that docxGenerator.js renders
 */
function renderResumeHTML(resumeData) {
  let html = ''
  
  // Header: Name (centered, 14pt to match CBS standards)
  html += `<div style="text-align: center; font-size: 14pt; font-weight: bold; margin-bottom: 2px;">
    ${escapeHTML(toTitleCase(resumeData.name))}
  </div>`
  
  // Contact (centered, pipe-separated)
  const contactParts = [
    resumeData.contact?.phone,
    resumeData.contact?.email,
    resumeData.contact?.linkedin
  ].filter(Boolean)
  
  if (contactParts.length > 0) {
    html += `<div style="text-align: center; font-size: 10pt; margin-bottom: 4px;">
      ${escapeHTML(contactParts.join(' | '))}
    </div>`
  }
  
  // Summary Section (if present) - THIS WAS MISSING
  if (resumeData.summary) {
    html += `<div style="font-weight: bold; border-bottom: 1px solid black; margin-top: 6px; margin-bottom: 2px; font-size: 12pt;">
      SUMMARY
    </div>`
    html += `<div style="font-size: 10pt; margin-bottom: 4px; text-align: justify;">
      ${escapeHTML(resumeData.summary)}
    </div>`
  }
  
  // Education Section
  if (resumeData.education && resumeData.education.length > 0) {
    html += `<div style="font-weight: bold; border-bottom: 1px solid black; margin-top: 6px; margin-bottom: 2px; font-size: 12pt;">
      EDUCATION
    </div>`
    
    resumeData.education.forEach(edu => {
      html += `<div style="margin-top: 4px;">
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 10pt;">
          <span>${escapeHTML((edu.institution || '').toUpperCase())}</span>
          <span style="font-weight: normal;">${escapeHTML(edu.dates || '')}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 10pt;">
          <span>${escapeHTML(edu.degree || '')}</span>
          <span style="font-style: italic;">${escapeHTML(edu.location || '')}</span>
        </div>`
      
      if (edu.details) {
        html += `<div style="font-style: italic; font-size: 10pt; margin-bottom: 4px;">
          ${escapeHTML(edu.details)}
        </div>`
      }
      
      html += `</div>`
    })
  }
  
  // Experience Section
  if (resumeData.experience && resumeData.experience.length > 0) {
    html += `<div style="font-weight: bold; border-bottom: 1px solid black; margin-top: 6px; margin-bottom: 2px; font-size: 12pt;">
      EXPERIENCE
    </div>`
    
    resumeData.experience.forEach(exp => {
      html += `<div style="margin-top: 4px;">
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 10pt;">
          <span>${escapeHTML((exp.company || '').toUpperCase())}</span>
          <span style="font-weight: normal;">${escapeHTML(exp.dates || '')}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 10pt; font-style: italic;">
          <span>${escapeHTML(exp.title || '')}</span>
          <span style="font-style: normal;">${escapeHTML(exp.location || '')}</span>
        </div>`
      
      if (exp.bullets && exp.bullets.length > 0) {
        html += `<ul style="margin: 0; padding-left: 18px; margin-top: 0; margin-bottom: 4px;">`
        exp.bullets.forEach(bullet => {
          html += `<li style="margin-bottom: 0; font-size: 10pt; line-height: 1.2;">${escapeHTML(bullet)}</li>`
        })
        html += `</ul>`
      }
      
      html += `</div>`
    })
  }
  
  // Skills Section
  if (resumeData.skills) {
    html += `<div style="font-weight: bold; border-bottom: 1px solid black; margin-top: 6px; margin-bottom: 2px; font-size: 12pt;">
      SKILLS
    </div>`
    html += `<div style="font-size: 10pt; margin-bottom: 4px;">
      ${escapeHTML(resumeData.skills)}
    </div>`
  }
  
  // Additional Section (if present)
  if (resumeData.additional) {
    html += `<div style="font-weight: bold; border-bottom: 1px solid black; margin-top: 6px; margin-bottom: 2px; font-size: 12pt;">
      ADDITIONAL
    </div>`
    html += `<div style="font-size: 10pt; margin-bottom: 4px;">
      ${escapeHTML(resumeData.additional)}
    </div>`
  }
  
  // Custom Sections (Awards, Volunteering, etc.)
  if (resumeData.custom_sections && resumeData.custom_sections.length > 0) {
    resumeData.custom_sections.forEach(section => {
      html += `<div style="font-weight: bold; border-bottom: 1px solid black; margin-top: 6px; margin-bottom: 2px; font-size: 12pt;">
        ${escapeHTML((section.title || '').toUpperCase())}
      </div>`
      
      if (section.content && section.content.length > 0) {
        // Check if entries are short enough for inline formatting
        const isCompact = section.content.every(item => item.length < 80) && section.content.length <= 4
        
        if (isCompact) {
          html += `<div style="font-size: 10pt; margin-bottom: 4px;">
            ${escapeHTML(section.content.join(' • '))}
          </div>`
        } else {
          html += `<ul style="margin: 0; padding-left: 18px; margin-bottom: 4px;">`
          section.content.forEach(item => {
            html += `<li style="margin-bottom: 0; font-size: 10pt; line-height: 1.2;">${escapeHTML(item)}</li>`
          })
          html += `</ul>`
        }
      }
    })
  }
  
  return html
}

/**
 * Convert string to Title Case (matching docxGenerator)
 */
function toTitleCase(str) {
  if (!str) return ''
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
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
 * @deprecated Use PageFit system instead. This function modifies content which violates
 * the principle that users should have full control over their content.
 * The PageFit system adjusts ONLY layout parameters (fonts, spacing, margins).
 * 
 * Compress resume to fit on one page
 * Uses deterministic trimming based on priority
 * @param {Object} resumeData - Resume data structure
 * @param {number} currentHeight - Current measured height in pixels
 * @returns {Object} - Compressed resume data
 */
export function compressResume(resumeData, currentHeight) {
  console.warn('⚠️ compressResume is deprecated. Use PageFit for layout-only fitting.')
  const compressed = JSON.parse(JSON.stringify(resumeData)) // Deep clone
  
  const overage = currentHeight - CONTENT_HEIGHT_PX
  const compressionNeeded = overage / currentHeight // Percentage to remove
  
  console.log(`Compression needed: ${(compressionNeeded * 100).toFixed(1)}% (${overage}px over)`)
  
  // Strategy 1: Trim custom sections first (Awards, Volunteering, etc.)
  // These are often lower priority than core experience
  if (compressed.custom_sections && compressed.custom_sections.length > 0) {
    for (let i = compressed.custom_sections.length - 1; i >= 0; i--) {
      const section = compressed.custom_sections[i]
      if (section.content && section.content.length > 3) {
        // Trim to 3 items max
        const removed = section.content.length - 3
        section.content = section.content.slice(0, 3)
        console.log(`Trimmed ${removed} item(s) from custom section "${section.title}"`)
        
        const newHeight = measureResumeHeight(compressed)
        if (newHeight <= CONTENT_HEIGHT_PX) {
          return compressed
        }
      }
    }
  }
  
  // Strategy 2: Remove bullets from oldest experiences first
  if (compressed.experience && compressed.experience.length > 0) {
    // Start from the last (oldest) experience
    for (let i = compressed.experience.length - 1; i >= 0; i--) {
      const exp = compressed.experience[i]
      
      if (exp.bullets && exp.bullets.length > 3) {
        // Remove bullets one at a time from oldest experiences (keep at least 3)
        const bulletsToRemove = Math.max(1, Math.ceil(exp.bullets.length * compressionNeeded))
        const targetLength = Math.max(3, exp.bullets.length - bulletsToRemove)
        
        // Remove last bullets (usually less important)
        const removed = exp.bullets.splice(targetLength)
        console.log(`Removed ${removed.length} bullet(s) from ${exp.company}`)
        
        // Check if we've compressed enough
        const newHeight = measureResumeHeight(compressed)
        if (newHeight <= CONTENT_HEIGHT_PX) {
          return compressed
        }
      }
    }
  }
  
  // Strategy 3: Trim skills section if still over
  if (compressed.skills && compressed.skills.length > 100) {
    const maxSkillsLength = Math.floor(compressed.skills.length * 0.7)
    compressed.skills = compressed.skills.substring(0, maxSkillsLength).trim() + '...'
    console.log('Trimmed skills section')
    
    const newHeight = measureResumeHeight(compressed)
    if (newHeight <= CONTENT_HEIGHT_PX) {
      return compressed
    }
  }
  
  // Strategy 4: Shorten summary if present
  if (compressed.summary && compressed.summary.length > 150) {
    // Trim to ~150 chars, ending at a sentence boundary if possible
    let trimmed = compressed.summary.substring(0, 150)
    const lastPeriod = trimmed.lastIndexOf('.')
    if (lastPeriod > 100) {
      trimmed = trimmed.substring(0, lastPeriod + 1)
    } else {
      trimmed = trimmed.trim() + '...'
    }
    compressed.summary = trimmed
    console.log('Shortened summary')
    
    const newHeight = measureResumeHeight(compressed)
    if (newHeight <= CONTENT_HEIGHT_PX) {
      return compressed
    }
  }
  
  // Strategy 5: Remove education details
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
  
  // Strategy 6: More aggressive bullet removal (down to 2 per role)
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
  
  // Strategy 7: Remove entire custom sections if still over
  if (compressed.custom_sections && compressed.custom_sections.length > 0) {
    while (compressed.custom_sections.length > 0) {
      const removed = compressed.custom_sections.pop()
      console.log(`Removed entire custom section "${removed.title}"`)
      
      const newHeight = measureResumeHeight(compressed)
      if (newHeight <= CONTENT_HEIGHT_PX) {
        return compressed
      }
    }
  }
  
  // Strategy 8: Remove additional section if present
  if (compressed.additional) {
    delete compressed.additional
    console.log('Removed additional section')
    
    const newHeight = measureResumeHeight(compressed)
    if (newHeight <= CONTENT_HEIGHT_PX) {
      return compressed
    }
  }
  
  // Strategy 9: Remove summary entirely as last resort before aggressive trim
  if (compressed.summary) {
    delete compressed.summary
    console.log('Removed summary section')
    
    const newHeight = measureResumeHeight(compressed)
    if (newHeight <= CONTENT_HEIGHT_PX) {
      return compressed
    }
  }
  
  return compressed
}

/**
 * @deprecated Use PageFit system instead. This function modifies content which violates
 * the principle that users should have full control over their content.
 * The new docxGenerator uses PageFit for layout-only fitting.
 * 
 * Ensure resume fits on one page using render → measure → compress loop
 * @param {Object} resumeData - Resume data structure
 * @param {number} maxIterations - Maximum compression attempts
 * @returns {Object} - Final resume data guaranteed to fit one page
 */
export async function ensureOnePage(resumeData, maxIterations = 5) {
  console.warn('⚠️ ensureOnePage is deprecated. docxGenerator now uses PageFit for layout-only fitting.')
  let currentData = JSON.parse(JSON.stringify(resumeData)) // Deep clone
  
  const initialHeight = measureResumeHeight(currentData)
  console.log(`📏 Initial resume height: ${initialHeight}px (limit: ${CONTENT_HEIGHT_PX}px)`)
  
  if (initialHeight <= CONTENT_HEIGHT_PX) {
    console.log('✅ Resume already fits on one page!')
    return currentData
  }
  
  console.log(`⚠️ Resume is ${initialHeight - CONTENT_HEIGHT_PX}px over limit, starting compression...`)
  
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const height = measureResumeHeight(currentData)
    const overagePercent = ((height - CONTENT_HEIGHT_PX) / CONTENT_HEIGHT_PX * 100).toFixed(1)
    
    console.log(`Iteration ${iteration + 1}/${maxIterations}: Height = ${height}px (${overagePercent}% over)`)
    
    if (height <= CONTENT_HEIGHT_PX) {
      console.log('✅ Resume now fits on one page!')
      return currentData
    }
    
    // Compress
    currentData = compressResume(currentData, height)
  }
  
  // Final check - if still over, do aggressive trim
  const finalHeight = measureResumeHeight(currentData)
  if (finalHeight > CONTENT_HEIGHT_PX) {
    console.warn('🔥 Still over one page after max iterations, doing aggressive trim')
    currentData = aggressiveTrim(currentData)
    
    // Verify aggressive trim worked
    const postTrimHeight = measureResumeHeight(currentData)
    if (postTrimHeight > CONTENT_HEIGHT_PX) {
      console.error(`❌ Even aggressive trim failed! Height: ${postTrimHeight}px (limit: ${CONTENT_HEIGHT_PX}px)`)
    } else {
      console.log(`✅ Aggressive trim successful! Final height: ${postTrimHeight}px`)
    }
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
  
  console.log('🔥 Running aggressive trim...')
  
  // Remove all custom sections
  if (trimmed.custom_sections) {
    console.log(`Removed all ${trimmed.custom_sections.length} custom sections`)
    delete trimmed.custom_sections
  }
  
  // Remove summary
  if (trimmed.summary) {
    console.log('Removed summary')
    delete trimmed.summary
  }
  
  // Remove additional
  if (trimmed.additional) {
    console.log('Removed additional')
    delete trimmed.additional
  }
  
  // Keep only most recent 3 experiences
  if (trimmed.experience && trimmed.experience.length > 3) {
    console.log(`Trimmed experiences from ${trimmed.experience.length} to 3`)
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
  
  // Keep only most recent 2 education entries
  if (trimmed.education && trimmed.education.length > 2) {
    trimmed.education = trimmed.education.slice(0, 2)
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
