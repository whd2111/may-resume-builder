/**
 * PageFit Module - Layout-Only Resume Fitting System
 * 
 * This module provides tools to fit resume content to exactly one page
 * by adjusting ONLY layout parameters (fonts, spacing, margins).
 * 
 * NON-NEGOTIABLE RULES:
 * 1. PageFit NEVER modifies resume text/content/ordering
 * 2. PageFit ONLY adjusts layout parameters
 * 3. PageFit runs ONLY during explicit Finalize/Export actions
 * 
 * Usage:
 * 
 * // For measuring fit percentage (during editing)
 * import { usePageFitIndicator, PageFitBadge } from './pageFit'
 * const { fitPercent, status } = usePageFitIndicator({ containerRef, resumeData })
 * 
 * // For export/finalize (layout adjustment)
 * import { runPageFit, getDefaultLayoutVars, layoutVarsToDocx } from './pageFit'
 * const layoutVars = getDefaultLayoutVars(charCount)
 * const result = await runPageFit(container, layoutVars, renderFn)
 * const docxStyles = layoutVarsToDocx(result.layoutVars)
 */

// Configuration
export {
  PAGE_SPEC,
  DENSITY_THRESHOLDS,
  LAYOUT_BOUNDS,
  FIT_CONFIG,
  getDefaultLayoutVars,
  getContentHeightPx,
  twipsToPx,
  pxToTwips,
  halfPointsToPx,
  clampLayoutVars,
  calculateCharCount,
} from './pageFitConfig.js'

// Core fitting functions
export {
  runPageFit,
  measureFit,
  measureRenderedHeight,
  applyLayoutVarsToCSS,
  calculateFitPercent,
  getFitStatus,
  layoutVarsToDocx,
} from './runPageFit.js'

// React hook and UI components
export {
  usePageFitIndicator,
  FitIndicator,
  PageFitBadge,
  getFitDisplayText,
  getFitStatusColor,
  getFitStatusBgColor,
} from './usePageFitIndicator.js'
