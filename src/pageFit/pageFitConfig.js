/**
 * PageFit Configuration
 * 
 * Central configuration for layout parameters used by the PageFit system.
 * PageFit adjusts ONLY these layout variables - it NEVER modifies content.
 * 
 * All measurements:
 * - Font sizes: half-points (multiply pt by 2 for docx, or use pt directly for CSS)
 * - Spacing: TWIPs for docx (1pt = 20 TWIPs), px for CSS
 * - Margins: TWIPs for docx, inches for reference
 */

// ============================================
// PAGE SPECIFICATIONS
// ============================================

export const PAGE_SPEC = {
  // US Letter dimensions
  WIDTH_INCHES: 8.5,
  HEIGHT_INCHES: 11,
  
  // In TWIPs (1 inch = 1440 TWIPs)
  WIDTH_TWIPS: 12240,
  HEIGHT_TWIPS: 15840,
  
  // In pixels at 96 DPI
  WIDTH_PX: 816,
  HEIGHT_PX: 1056,
  
  // DPI for conversions
  DPI: 96,
}

// ============================================
// DENSITY THRESHOLDS
// ============================================

// Character count thresholds for determining layout density mode
export const DENSITY_THRESHOLDS = {
  // Below this: use "cozy" mode (larger fonts, more spacing)
  SPARSE_MAX: 3000,
  // Above sparse max: use "compact" mode (tighter layout)
}

// ============================================
// LAYOUT VARIABLE BOUNDS
// ============================================

/**
 * Bounds for adjustable layout parameters.
 * PageFit will adjust within these bounds to achieve fit.
 * 
 * For each parameter:
 * - min: minimum allowed value (most compact)
 * - max: maximum allowed value (most spacious)
 * - step: increment/decrement step size for fitting
 * - default_cozy: default for sparse content
 * - default_compact: default for dense content
 */

export const LAYOUT_BOUNDS = {
  // Body font size (in half-points for DOCX, so 20 = 10pt)
  bodyFontSize: {
    min: 18,           // 9pt - absolute minimum for readability
    max: 24,           // 12pt - maximum for body text
    step: 1,           // 0.5pt increments
    default_cozy: 24,  // 12pt for sparse resumes
    default_compact: 20, // 10pt for dense resumes
  },
  
  // Name font size (in half-points)
  nameFontSize: {
    min: 24,           // 12pt minimum
    max: 32,           // 16pt maximum
    step: 2,           // 1pt increments
    default_cozy: 32,  // 16pt for sparse
    default_compact: 28, // 14pt for dense
  },
  
  // Section header font size (in half-points)
  sectionHeaderFontSize: {
    min: 20,           // 10pt minimum
    max: 26,           // 13pt maximum
    step: 2,           // 1pt increments
    default_cozy: 26,  // 13pt for sparse
    default_compact: 24, // 12pt for dense
  },
  
  // Line height (as multiplier, e.g., 1.0 = single, 1.15, 1.25)
  // In TWIPs: 240 = 1.0, 276 = 1.15, 300 = 1.25
  lineHeight: {
    min: 240,          // 1.0 (single spacing)
    max: 300,          // 1.25 spacing
    step: 12,          // ~0.05 increments
    default_cozy: 276, // 1.15 for sparse
    default_compact: 240, // 1.0 for dense
  },
  
  // Page margins (in TWIPs, 1440 = 1 inch, 720 = 0.5 inch)
  margins: {
    min: 576,          // 0.4 inches - minimum ATS-safe
    max: 1440,         // 1.0 inch
    step: 72,          // 0.05 inch increments
    default_cozy: 1440, // 1.0 inch for sparse
    default_compact: 720, // 0.5 inch for dense
  },
  
  // Section spacing before (in TWIPs)
  sectionSpacingBefore: {
    min: 60,           // 3pt
    max: 200,          // 10pt
    step: 20,          // 1pt increments
    default_cozy: 160, // 8pt
    default_compact: 120, // 6pt
  },
  
  // Section spacing after (in TWIPs)
  sectionSpacingAfter: {
    min: 20,           // 1pt
    max: 100,          // 5pt
    step: 20,          // 1pt increments
    default_cozy: 80,  // 4pt
    default_compact: 40, // 2pt
  },
  
  // Role/entry gap (in TWIPs)
  roleGap: {
    min: 40,           // 2pt minimum
    max: 160,          // 8pt maximum
    step: 20,          // 1pt increments
    default_cozy: 120, // 6pt
    default_compact: 80, // 4pt
  },
  
  // Bullet spacing after (in TWIPs)
  bulletSpacing: {
    min: 0,            // 0pt (tight)
    max: 60,           // 3pt
    step: 20,          // 1pt increments
    default_cozy: 40,  // 2pt
    default_compact: 0, // 0pt
  },
  
  // Contact info spacing after (in TWIPs)
  contactSpacingAfter: {
    min: 40,           // 2pt
    max: 120,          // 6pt
    step: 20,          // 1pt increments
    default_cozy: 100, // 5pt
    default_compact: 80, // 4pt
  },
  
  // Name spacing after (in TWIPs)
  nameSpacingAfter: {
    min: 20,           // 1pt
    max: 80,           // 4pt
    step: 20,          // 1pt increments
    default_cozy: 60,  // 3pt
    default_compact: 40, // 2pt
  },
}

// ============================================
// FITTING CONFIGURATION
// ============================================

export const FIT_CONFIG = {
  // Safety buffer in pixels (accounts for rendering differences)
  safetyBufferPx: 20,
  
  // Tolerance: if within this % of target, consider it "fit"
  tolerancePercent: 2, // 2% = 98-102% is considered acceptable
  
  // Maximum iterations for fitting algorithm
  maxIterations: 20,
  
  // Adjustment priority order (what to adjust first)
  // Higher priority = adjusted first when overflow
  // For underfull, reverse order is used
  adjustmentPriority: [
    'bulletSpacing',      // First: reduce bullet spacing
    'roleGap',            // Then: reduce role gaps
    'sectionSpacingAfter', // Then: section spacing
    'sectionSpacingBefore',
    'contactSpacingAfter',
    'nameSpacingAfter',
    'lineHeight',         // Then: line height
    'bodyFontSize',       // Then: font size (last resort)
    'margins',            // Finally: margins (last-last resort)
  ],
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get default layout variables based on content density
 * @param {number} charCount - Total character count of resume content
 * @returns {Object} - Layout variables object
 */
export function getDefaultLayoutVars(charCount) {
  const isCozy = charCount < DENSITY_THRESHOLDS.SPARSE_MAX
  const mode = isCozy ? 'default_cozy' : 'default_compact'
  
  const layoutVars = {}
  for (const [key, bounds] of Object.entries(LAYOUT_BOUNDS)) {
    layoutVars[key] = bounds[mode]
  }
  
  layoutVars._mode = isCozy ? 'cozy' : 'compact'
  layoutVars._charCount = charCount
  
  return layoutVars
}

/**
 * Calculate content area height given margins
 * @param {number} marginTwips - Margin in TWIPs
 * @returns {number} - Available content height in pixels
 */
export function getContentHeightPx(marginTwips) {
  const marginPx = (marginTwips / 1440) * PAGE_SPEC.DPI
  return PAGE_SPEC.HEIGHT_PX - (marginPx * 2) - FIT_CONFIG.safetyBufferPx
}

/**
 * Convert TWIPs to pixels
 * @param {number} twips - Value in TWIPs
 * @returns {number} - Value in pixels
 */
export function twipsToPx(twips) {
  // 1 inch = 1440 TWIPs = 96 pixels
  return (twips / 1440) * PAGE_SPEC.DPI
}

/**
 * Convert pixels to TWIPs
 * @param {number} px - Value in pixels
 * @returns {number} - Value in TWIPs
 */
export function pxToTwips(px) {
  return (px / PAGE_SPEC.DPI) * 1440
}

/**
 * Convert half-points to pixels (for fonts)
 * @param {number} halfPoints - Font size in half-points
 * @returns {number} - Font size in pixels (approximately)
 */
export function halfPointsToPx(halfPoints) {
  // 1pt = 1.333px approximately at 96 DPI
  return (halfPoints / 2) * 1.333
}

/**
 * Validate that layout vars are within bounds
 * @param {Object} layoutVars - Layout variables to validate
 * @returns {Object} - Validated and clamped layout variables
 */
export function clampLayoutVars(layoutVars) {
  const clamped = { ...layoutVars }
  
  for (const [key, bounds] of Object.entries(LAYOUT_BOUNDS)) {
    if (clamped[key] !== undefined) {
      clamped[key] = Math.max(bounds.min, Math.min(bounds.max, clamped[key]))
    }
  }
  
  return clamped
}

/**
 * Calculate total character count of resume data
 * @param {Object} resumeData - Resume data structure
 * @returns {number} - Total character count
 */
export function calculateCharCount(resumeData) {
  let count = 0
  
  // Name
  if (resumeData.name) count += resumeData.name.length
  
  // Contact
  if (resumeData.contact) {
    if (resumeData.contact.phone) count += resumeData.contact.phone.length
    if (resumeData.contact.email) count += resumeData.contact.email.length
    if (resumeData.contact.linkedin) count += resumeData.contact.linkedin.length
  }
  
  // Summary
  if (resumeData.summary) count += resumeData.summary.length
  
  // Education
  if (resumeData.education) {
    resumeData.education.forEach(edu => {
      if (edu.institution) count += edu.institution.length
      if (edu.degree) count += edu.degree.length
      if (edu.location) count += edu.location.length
      if (edu.dates) count += edu.dates.length
      if (edu.details) count += edu.details.length
      if (edu.gpa) count += edu.gpa.length
    })
  }
  
  // Experience
  if (resumeData.experience) {
    resumeData.experience.forEach(exp => {
      if (exp.company) count += exp.company.length
      if (exp.title) count += exp.title.length
      if (exp.location) count += exp.location.length
      if (exp.dates) count += exp.dates.length
      if (exp.bullets) {
        exp.bullets.forEach(bullet => {
          if (bullet) count += bullet.length
        })
      }
    })
  }
  
  // Skills
  if (resumeData.skills) count += resumeData.skills.length
  
  // Additional
  if (resumeData.additional) count += resumeData.additional.length
  
  // Custom sections
  if (resumeData.custom_sections) {
    resumeData.custom_sections.forEach(section => {
      if (section.title) count += section.title.length
      if (section.content) {
        section.content.forEach(item => {
          if (item) count += item.length
        })
      }
    })
  }
  
  return count
}
