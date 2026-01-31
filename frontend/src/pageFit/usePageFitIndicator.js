/**
 * usePageFitIndicator - Measure-Only Hook
 * 
 * This hook provides a read-only fit indicator that:
 * 1. Measures content height with debouncing
 * 2. Computes fit percentage
 * 3. Does NOT apply any layout changes
 * 
 * Use this hook during editing to show users if their
 * content will fit. The actual fitting happens only
 * during explicit Export/Finalize actions.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { measureFit } from './runPageFit.js'
import { 
  getDefaultLayoutVars, 
  calculateCharCount,
  LAYOUT_BOUNDS,
} from './pageFitConfig.js'

// ============================================
// DEBOUNCE UTILITY
// ============================================

/**
 * Creates a debounced function
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Debounced function
 */
function useDebouncedCallback(fn, delay) {
  const timeoutRef = useRef(null)
  
  const debouncedFn = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      fn(...args)
    }, delay)
  }, [fn, delay])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])
  
  return debouncedFn
}

// ============================================
// PAGE FIT INDICATOR HOOK
// ============================================

/**
 * Hook to measure and display fit percentage without modifying layout
 * 
 * @param {Object} options - Configuration options
 * @param {React.RefObject} options.containerRef - Ref to the container element
 * @param {Object} options.resumeData - Resume data (for character count)
 * @param {Object} options.layoutVars - Current layout variables (optional)
 * @param {number} options.debounceMs - Debounce delay (default: 300ms)
 * @param {boolean} options.enabled - Whether measurement is enabled (default: true)
 * 
 * @returns {Object} - Fit indicator state
 */
export function usePageFitIndicator({
  containerRef,
  resumeData,
  layoutVars: externalLayoutVars,
  debounceMs = 300,
  enabled = true,
}) {
  const [fitState, setFitState] = useState({
    fitPercent: 100,
    status: 'fit',
    contentHeight: 0,
    availableHeight: 0,
    mode: 'unknown',
    charCount: 0,
    isStale: true, // True until first measurement
  })
  
  // Memoize layout vars computation
  const layoutVars = useRef(externalLayoutVars || null)
  
  // Update layout vars when resume data changes (for density mode)
  useEffect(() => {
    if (resumeData) {
      const charCount = calculateCharCount(resumeData)
      const defaultVars = getDefaultLayoutVars(charCount)
      
      // Use external layout vars if provided, otherwise use density-based defaults
      layoutVars.current = externalLayoutVars || defaultVars
      
      setFitState(prev => ({
        ...prev,
        charCount,
        mode: defaultVars._mode,
        isStale: true,
      }))
    }
  }, [resumeData, externalLayoutVars])
  
  // Measurement function
  const performMeasurement = useCallback(() => {
    if (!enabled) return
    
    const container = containerRef?.current
    if (!container) {
      return
    }
    
    const result = measureFit(container, layoutVars.current)
    
    setFitState(prev => ({
      ...prev,
      ...result,
      isStale: false,
    }))
  }, [containerRef, enabled])
  
  // Debounced measurement
  const debouncedMeasure = useDebouncedCallback(performMeasurement, debounceMs)
  
  // Trigger measurement when resume data changes
  useEffect(() => {
    if (resumeData && enabled) {
      // Mark as stale immediately
      setFitState(prev => ({ ...prev, isStale: true }))
      
      // Schedule debounced measurement
      debouncedMeasure()
    }
  }, [resumeData, enabled, debouncedMeasure])
  
  // Also re-measure on window resize
  useEffect(() => {
    if (!enabled) return
    
    const handleResize = () => {
      setFitState(prev => ({ ...prev, isStale: true }))
      debouncedMeasure()
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [enabled, debouncedMeasure])
  
  // Manual refresh function
  const refresh = useCallback(() => {
    setFitState(prev => ({ ...prev, isStale: true }))
    performMeasurement()
  }, [performMeasurement])
  
  return {
    ...fitState,
    refresh,
    layoutVars: layoutVars.current,
  }
}

// ============================================
// FIT INDICATOR COMPONENT
// ============================================

/**
 * Render props component for displaying fit indicator
 * 
 * @param {Object} props
 * @param {number} props.fitPercent - Fit percentage
 * @param {string} props.status - 'fit' | 'overflow' | 'underfull'
 * @param {boolean} props.isStale - Whether measurement is stale
 * @param {Function} props.children - Render function
 */
export function FitIndicator({ fitPercent, status, isStale, children }) {
  // If children is a function, call it with state
  if (typeof children === 'function') {
    return children({ fitPercent, status, isStale })
  }
  
  // Otherwise render nothing
  return null
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get display text for fit status
 * @param {number} fitPercent - Fit percentage
 * @param {string} status - Status string
 * @returns {string} - Human-readable status
 */
export function getFitDisplayText(fitPercent, status) {
  switch (status) {
    case 'overflow':
      return `Overflow (${fitPercent}%)`
    case 'underfull':
      return `Underfull (${fitPercent}%)`
    case 'fit':
    default:
      return `Fits (${fitPercent}%)`
  }
}

/**
 * Get color for fit status
 * @param {string} status - Status string
 * @returns {string} - CSS color value
 */
export function getFitStatusColor(status) {
  switch (status) {
    case 'overflow':
      return '#ef4444' // Red
    case 'underfull':
      return '#f59e0b' // Amber
    case 'fit':
    default:
      return '#10b981' // Green
  }
}

/**
 * Get background color for fit status
 * @param {string} status - Status string
 * @returns {string} - CSS background color value
 */
export function getFitStatusBgColor(status) {
  switch (status) {
    case 'overflow':
      return '#fef2f2' // Red-50
    case 'underfull':
      return '#fffbeb' // Amber-50
    case 'fit':
    default:
      return '#f0fdf4' // Green-50
  }
}

// ============================================
// PREBUILT FIT INDICATOR UI COMPONENT
// ============================================

/**
 * Ready-to-use fit indicator badge component
 * Shows the current fit percentage with appropriate styling
 * 
 * @param {Object} props
 * @param {number} props.fitPercent - Fit percentage
 * @param {string} props.status - Status string
 * @param {boolean} props.isStale - Whether measurement is stale
 * @param {string} props.mode - Density mode ('cozy' | 'compact')
 * @param {Function} props.onFinalize - Callback when Finalize button is clicked
 * @param {Object} props.style - Additional inline styles
 */
export function PageFitBadge({ 
  fitPercent, 
  status, 
  isStale, 
  mode, 
  onFinalize,
  style = {} 
}) {
  const color = getFitStatusColor(status)
  const bgColor = getFitStatusBgColor(status)
  const text = getFitDisplayText(fitPercent, status)
  
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 12px',
      borderRadius: '20px',
      background: bgColor,
      border: `1px solid ${color}`,
      fontSize: '13px',
      fontWeight: '500',
      color: color,
      opacity: isStale ? 0.6 : 1,
      transition: 'all 0.2s ease',
      ...style,
    }}>
      {/* Status indicator dot */}
      <span style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: color,
        animation: isStale ? 'pulse 1s infinite' : 'none',
      }} />
      
      {/* Text */}
      <span>{isStale ? 'Measuring...' : text}</span>
      
      {/* Mode badge */}
      {mode && !isStale && (
        <span style={{
          fontSize: '10px',
          padding: '2px 6px',
          background: 'rgba(0,0,0,0.1)',
          borderRadius: '4px',
          textTransform: 'uppercase',
        }}>
          {mode}
        </span>
      )}
      
      {/* Finalize button for overflow/underfull */}
      {onFinalize && status !== 'fit' && !isStale && (
        <button
          onClick={onFinalize}
          style={{
            marginLeft: '4px',
            padding: '4px 8px',
            fontSize: '11px',
            fontWeight: '600',
            background: color,
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Fix Layout
        </button>
      )}
    </div>
  )
}

export default usePageFitIndicator
