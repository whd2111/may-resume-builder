/**
 * PageFit - Layout-Only Resume Fitting System
 * 
 * NON-NEGOTIABLE RULES:
 * 1. PageFit NEVER modifies resume text/content/ordering
 * 2. PageFit ONLY adjusts layout parameters (font sizes, spacing, margins)
 * 3. PageFit runs ONLY during explicit Finalize/Export actions
 * 
 * This module accepts only: (containerEl, pageSpec, currentLayoutVars)
 * and returns only: (nextLayoutVars, fitPercent)
 * 
 * It does NOT import or have access to resume content - 
 * it only measures the rendered output.
 */

import {
  LAYOUT_BOUNDS,
  FIT_CONFIG,
  PAGE_SPEC,
  getContentHeightPx,
  clampLayoutVars,
  twipsToPx,
  halfPointsToPx,
} from './pageFitConfig.js'

// ============================================
// TYPES (documented for clarity)
// ============================================

/**
 * @typedef {Object} PageFitResult
 * @property {Object} layoutVars - The adjusted layout variables
 * @property {number} fitPercent - Content height as % of available height (100 = perfect fit)
 * @property {string} status - 'fit' | 'overflow' | 'underfull'
 * @property {number} iterations - Number of iterations taken
 * @property {string} mode - 'cozy' | 'compact' (density mode used)
 */

// ============================================
// CORE MEASUREMENT FUNCTION
// ============================================

/**
 * Measure the rendered height of content in a container
 * This is the ONLY way PageFit interacts with content - by measuring
 * the rendered output, never by reading the content directly.
 * 
 * @param {HTMLElement} containerEl - The element containing rendered resume
 * @returns {number} - Height in pixels
 */
export function measureRenderedHeight(containerEl) {
  if (!containerEl) {
    console.warn('PageFit: No container element provided for measurement')
    return 0
  }
  
  // Force layout recalculation
  containerEl.offsetHeight
  
  // Get the actual rendered height
  const height = containerEl.scrollHeight || containerEl.offsetHeight
  
  return height
}

// ============================================
// LAYOUT APPLICATION
// ============================================

/**
 * Apply layout variables to a container element via CSS custom properties
 * This allows the render function to use these variables without
 * PageFit knowing about the content structure.
 * 
 * @param {HTMLElement} containerEl - The container to apply styles to
 * @param {Object} layoutVars - Layout variables to apply
 */
export function applyLayoutVarsToCSS(containerEl, layoutVars) {
  if (!containerEl) return
  
  // Convert layout vars to CSS custom properties
  containerEl.style.setProperty('--pf-body-font-size', `${layoutVars.bodyFontSize / 2}pt`)
  containerEl.style.setProperty('--pf-name-font-size', `${layoutVars.nameFontSize / 2}pt`)
  containerEl.style.setProperty('--pf-section-header-font-size', `${layoutVars.sectionHeaderFontSize / 2}pt`)
  containerEl.style.setProperty('--pf-line-height', layoutVars.lineHeight / 240) // Convert to multiplier
  containerEl.style.setProperty('--pf-margins', `${twipsToPx(layoutVars.margins)}px`)
  containerEl.style.setProperty('--pf-section-spacing-before', `${twipsToPx(layoutVars.sectionSpacingBefore)}px`)
  containerEl.style.setProperty('--pf-section-spacing-after', `${twipsToPx(layoutVars.sectionSpacingAfter)}px`)
  containerEl.style.setProperty('--pf-role-gap', `${twipsToPx(layoutVars.roleGap)}px`)
  containerEl.style.setProperty('--pf-bullet-spacing', `${twipsToPx(layoutVars.bulletSpacing)}px`)
  containerEl.style.setProperty('--pf-contact-spacing-after', `${twipsToPx(layoutVars.contactSpacingAfter)}px`)
  containerEl.style.setProperty('--pf-name-spacing-after', `${twipsToPx(layoutVars.nameSpacingAfter)}px`)
}

// ============================================
// FITTING ALGORITHMS
// ============================================

/**
 * Adjust a single layout variable by one step in the specified direction
 * 
 * @param {Object} layoutVars - Current layout variables
 * @param {string} varName - Name of variable to adjust
 * @param {'tighten'|'loosen'} direction - Direction to adjust
 * @returns {Object|null} - New layout vars, or null if at bounds
 */
function adjustLayoutVar(layoutVars, varName, direction) {
  const bounds = LAYOUT_BOUNDS[varName]
  if (!bounds) return null
  
  const currentValue = layoutVars[varName]
  let newValue
  
  if (direction === 'tighten') {
    // Move toward minimum (more compact)
    newValue = currentValue - bounds.step
    if (newValue < bounds.min) return null
  } else {
    // Move toward maximum (more spacious)
    newValue = currentValue + bounds.step
    if (newValue > bounds.max) return null
  }
  
  return {
    ...layoutVars,
    [varName]: newValue,
  }
}

/**
 * Calculate fit percentage
 * 
 * @param {number} contentHeight - Measured content height in pixels
 * @param {number} availableHeight - Available page height in pixels
 * @returns {number} - Fit percentage (100 = perfect, >100 = overflow, <100 = underfull)
 */
export function calculateFitPercent(contentHeight, availableHeight) {
  if (availableHeight <= 0) return 100
  return Math.round((contentHeight / availableHeight) * 100)
}

/**
 * Determine fit status from percentage
 * 
 * @param {number} fitPercent - Fit percentage
 * @returns {'fit'|'overflow'|'underfull'} - Status string
 */
export function getFitStatus(fitPercent) {
  const tolerance = FIT_CONFIG.tolerancePercent
  
  if (fitPercent > 100 + tolerance) {
    return 'overflow'
  } else if (fitPercent < 100 - tolerance) {
    return 'underfull'
  } else {
    return 'fit'
  }
}

// ============================================
// MAIN PAGEFIT FUNCTION
// ============================================

/**
 * Run the PageFit algorithm to determine optimal layout variables
 * 
 * CRITICAL: This function does NOT modify content. It only:
 * 1. Measures the rendered content height
 * 2. Adjusts layout variables within bounds
 * 3. Returns the optimal layout variables
 * 
 * The caller is responsible for:
 * 1. Rendering content with the returned layout variables
 * 2. Passing a container element with rendered content
 * 
 * @param {HTMLElement} containerEl - Container with rendered resume content
 * @param {Object} currentLayoutVars - Starting layout variables
 * @param {Function} renderWithVars - Function to re-render content with new layout vars
 * @returns {PageFitResult} - Result with optimal layout vars and fit info
 */
export async function runPageFit(containerEl, currentLayoutVars, renderWithVars) {
  if (!containerEl) {
    throw new Error('PageFit: Container element is required')
  }
  
  if (!renderWithVars || typeof renderWithVars !== 'function') {
    throw new Error('PageFit: renderWithVars function is required')
  }
  
  let layoutVars = clampLayoutVars({ ...currentLayoutVars })
  let iterations = 0
  const maxIterations = FIT_CONFIG.maxIterations
  
  // Calculate available height based on current margins
  const availableHeight = getContentHeightPx(layoutVars.margins)
  
  // Initial render and measurement
  await renderWithVars(layoutVars)
  let contentHeight = measureRenderedHeight(containerEl)
  let fitPercent = calculateFitPercent(contentHeight, availableHeight)
  let status = getFitStatus(fitPercent)
  
  console.log(`PageFit: Initial state - ${fitPercent}% (${status}), content: ${contentHeight}px, available: ${availableHeight}px`)
  
  // If already within tolerance, we're done
  if (status === 'fit') {
    return {
      layoutVars,
      fitPercent,
      status,
      iterations,
      mode: layoutVars._mode || 'unknown',
    }
  }
  
  // Determine adjustment direction and priorities
  const direction = status === 'overflow' ? 'tighten' : 'loosen'
  const priorities = direction === 'tighten' 
    ? FIT_CONFIG.adjustmentPriority 
    : [...FIT_CONFIG.adjustmentPriority].reverse()
  
  // Iterative fitting
  while (iterations < maxIterations && status !== 'fit') {
    iterations++
    let adjusted = false
    
    // Try adjusting each variable in priority order
    for (const varName of priorities) {
      const newLayoutVars = adjustLayoutVar(layoutVars, varName, direction)
      
      if (newLayoutVars) {
        // Re-render with new layout vars
        await renderWithVars(newLayoutVars)
        
        // Re-calculate available height if margins changed
        const newAvailableHeight = getContentHeightPx(newLayoutVars.margins)
        
        // Measure new height
        const newContentHeight = measureRenderedHeight(containerEl)
        const newFitPercent = calculateFitPercent(newContentHeight, newAvailableHeight)
        const newStatus = getFitStatus(newFitPercent)
        
        // Check if this adjustment helped
        const improved = (direction === 'tighten' && newFitPercent < fitPercent) ||
                        (direction === 'loosen' && newFitPercent > fitPercent)
        
        if (improved || newStatus === 'fit') {
          layoutVars = newLayoutVars
          contentHeight = newContentHeight
          fitPercent = newFitPercent
          status = newStatus
          adjusted = true
          
          console.log(`PageFit: Iteration ${iterations} - Adjusted ${varName}, now ${fitPercent}% (${status})`)
          
          // If we've achieved fit, stop
          if (status === 'fit') {
            break
          }
          
          // Continue with this priority variable if it helped
          break
        }
      }
    }
    
    // If no adjustment helped, we've done what we can
    if (!adjusted) {
      console.log(`PageFit: No further adjustments possible at iteration ${iterations}`)
      break
    }
  }
  
  const finalResult = {
    layoutVars: clampLayoutVars(layoutVars),
    fitPercent,
    status,
    iterations,
    mode: layoutVars._mode || 'unknown',
  }
  
  console.log(`PageFit: Complete after ${iterations} iterations - ${fitPercent}% (${status})`)
  
  return finalResult
}

// ============================================
// SYNCHRONOUS SINGLE-PASS MEASUREMENT
// ============================================

/**
 * Measure fit percentage without adjusting layout (for indicator)
 * This is a read-only operation that doesn't modify anything.
 * 
 * @param {HTMLElement} containerEl - Container with rendered content
 * @param {Object} layoutVars - Current layout variables
 * @returns {{fitPercent: number, status: string, contentHeight: number, availableHeight: number}}
 */
export function measureFit(containerEl, layoutVars) {
  if (!containerEl) {
    return { fitPercent: 100, status: 'fit', contentHeight: 0, availableHeight: 0 }
  }
  
  const contentHeight = measureRenderedHeight(containerEl)
  const availableHeight = getContentHeightPx(layoutVars?.margins || LAYOUT_BOUNDS.margins.default_compact)
  const fitPercent = calculateFitPercent(contentHeight, availableHeight)
  const status = getFitStatus(fitPercent)
  
  return {
    fitPercent,
    status,
    contentHeight,
    availableHeight,
  }
}

// ============================================
// LAYOUT VARS FOR DOCX GENERATION
// ============================================

/**
 * Convert layout variables to DOCX-compatible format
 * Used by docxGenerator to apply PageFit results
 * 
 * @param {Object} layoutVars - PageFit layout variables
 * @returns {Object} - DOCX-compatible style constants
 */
export function layoutVarsToDocx(layoutVars) {
  return {
    MARGIN: layoutVars.margins,
    FONT_SIZE: {
      NAME: layoutVars.nameFontSize,
      CONTACT: layoutVars.bodyFontSize,
      SECTION_HEADER: layoutVars.sectionHeaderFontSize,
      BODY: layoutVars.bodyFontSize,
      COMPANY_TITLE: layoutVars.bodyFontSize,
      BULLET: layoutVars.bodyFontSize,
    },
    SPACING: {
      SECTION_BEFORE: layoutVars.sectionSpacingBefore,
      SECTION_AFTER: layoutVars.sectionSpacingAfter,
      ROLE_GAP: layoutVars.roleGap,
      BULLET_AFTER: layoutVars.bulletSpacing,
      CONTACT_AFTER: layoutVars.contactSpacingAfter,
      NAME_AFTER: layoutVars.nameSpacingAfter,
    },
    LINE_HEIGHT: layoutVars.lineHeight,
  }
}

// ============================================
// EXPORT HELPERS
// ============================================

export {
  LAYOUT_BOUNDS,
  FIT_CONFIG,
  PAGE_SPEC,
}
