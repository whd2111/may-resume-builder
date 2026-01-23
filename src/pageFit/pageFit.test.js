/**
 * PageFit Unit Tests
 * 
 * Tests for the PageFit system that adjusts layout parameters
 * to fit resume content on exactly one page.
 * 
 * CRITICAL INVARIANT: PageFit NEVER modifies content.
 * All tests verify that content remains unchanged.
 */

import { describe, it, expect, vi } from 'vitest'
import {
  LAYOUT_BOUNDS,
  FIT_CONFIG,
  PAGE_SPEC,
  getDefaultLayoutVars,
  calculateCharCount,
  clampLayoutVars,
  getContentHeightPx,
  DENSITY_THRESHOLDS,
} from './pageFitConfig.js'
import {
  calculateFitPercent,
  getFitStatus,
  layoutVarsToDocx,
} from './runPageFit.js'
import {
  getFitDisplayText,
  getFitStatusColor,
} from './usePageFitIndicator.js'

// ============================================
// FIXTURE DATA
// ============================================

const SPARSE_RESUME = {
  name: 'John Doe',
  contact: {
    phone: '555-123-4567',
    email: 'john@example.com',
    linkedin: 'linkedin.com/in/johndoe',
  },
  education: [
    {
      institution: 'University of Example',
      degree: 'Bachelor of Science',
      location: 'City, ST',
      dates: '2018 - 2022',
      gpa: '3.8/4.0',
      details: 'magna cum laude',
    },
  ],
  experience: [
    {
      company: 'Example Corp',
      title: 'Software Engineer',
      location: 'City, ST',
      dates: '2022 - Present',
      bullets: [
        'Developed web applications using React',
        'Collaborated with cross-functional teams',
      ],
    },
  ],
  skills: 'JavaScript, React, Node.js',
}

const DENSE_RESUME = {
  name: 'Jane Smith',
  contact: {
    phone: '555-987-6543',
    email: 'jane@example.com',
    linkedin: 'linkedin.com/in/janesmith',
  },
  summary: 'Experienced software engineer with 10+ years of experience in full-stack development, leading teams, and delivering enterprise-scale applications. Passionate about clean code, mentoring junior developers, and driving technical excellence.',
  education: [
    {
      institution: 'Stanford University',
      degree: 'Master of Science in Computer Science',
      location: 'Stanford, CA',
      dates: '2010 - 2012',
      gpa: '3.9/4.0',
      details: 'Focus on Machine Learning and Distributed Systems',
    },
    {
      institution: 'MIT',
      degree: 'Bachelor of Science in Computer Science',
      location: 'Cambridge, MA',
      dates: '2006 - 2010',
      gpa: '3.85/4.0',
      details: 'summa cum laude, Phi Beta Kappa',
    },
  ],
  experience: [
    {
      company: 'Google',
      title: 'Senior Staff Software Engineer',
      location: 'Mountain View, CA',
      dates: '2018 - Present',
      bullets: [
        'Led architecture and implementation of core search ranking improvements, resulting in 15% improvement in user engagement metrics across 2B+ daily queries',
        'Designed and deployed machine learning pipeline processing 100TB+ data daily with 99.99% uptime SLA',
        'Mentored 12 engineers across 3 teams, with 4 promoted to senior roles within 2 years',
        'Drove adoption of new testing framework reducing bug escape rate by 40% organization-wide',
        'Authored 5 patents related to search quality and natural language processing',
      ],
    },
    {
      company: 'Facebook',
      title: 'Software Engineer',
      location: 'Menlo Park, CA',
      dates: '2014 - 2018',
      bullets: [
        'Built real-time notification system serving 500M+ users with <100ms p99 latency',
        'Developed React components used by 200+ engineers in News Feed team',
        'Optimized database queries reducing page load time by 30%',
        'Led migration from PHP to Hack, improving developer productivity by 25%',
      ],
    },
    {
      company: 'Microsoft',
      title: 'Software Development Engineer',
      location: 'Redmond, WA',
      dates: '2012 - 2014',
      bullets: [
        'Developed features for Azure cloud platform serving 1M+ enterprise customers',
        'Implemented CI/CD pipeline reducing deployment time from 2 days to 2 hours',
        'Collaborated with PM and design teams to deliver 3 major feature releases',
      ],
    },
  ],
  skills: 'Languages: Python, Java, C++, JavaScript, TypeScript, Go. Frameworks: React, Angular, TensorFlow, PyTorch. Tools: Kubernetes, Docker, AWS, GCP, Azure. Databases: PostgreSQL, MongoDB, Redis, BigQuery.',
  custom_sections: [
    {
      title: 'Publications',
      content: [
        'Smith, J. et al. "Advances in Neural Search Ranking" - SIGIR 2021 (Best Paper)',
        'Smith, J. "Distributed Systems at Scale" - OSDI 2019',
        'Smith, J. et al. "Real-time ML Inference" - KDD 2020',
      ],
    },
    {
      title: 'Awards',
      content: [
        'Google Engineering Excellence Award (2020, 2022)',
        'Facebook Hackathon Winner (2016)',
        'ACM ICPC World Finals Participant (2010)',
      ],
    },
  ],
}

// ============================================
// CONFIG TESTS
// ============================================

describe('PageFit Configuration', () => {
  it('should have valid layout bounds with min < max', () => {
    for (const [key, bounds] of Object.entries(LAYOUT_BOUNDS)) {
      expect(bounds.min).toBeLessThan(bounds.max)
      expect(bounds.step).toBeGreaterThan(0)
      expect(bounds.default_cozy).toBeGreaterThanOrEqual(bounds.min)
      expect(bounds.default_cozy).toBeLessThanOrEqual(bounds.max)
      expect(bounds.default_compact).toBeGreaterThanOrEqual(bounds.min)
      expect(bounds.default_compact).toBeLessThanOrEqual(bounds.max)
    }
  })

  it('should have valid fit configuration', () => {
    expect(FIT_CONFIG.safetyBufferPx).toBeGreaterThan(0)
    expect(FIT_CONFIG.tolerancePercent).toBeGreaterThan(0)
    expect(FIT_CONFIG.tolerancePercent).toBeLessThan(10) // Reasonable tolerance
    expect(FIT_CONFIG.maxIterations).toBeGreaterThan(0)
    expect(FIT_CONFIG.adjustmentPriority.length).toBeGreaterThan(0)
  })

  it('should have valid page specifications', () => {
    expect(PAGE_SPEC.WIDTH_INCHES).toBe(8.5) // US Letter
    expect(PAGE_SPEC.HEIGHT_INCHES).toBe(11) // US Letter
    expect(PAGE_SPEC.WIDTH_TWIPS).toBe(12240) // 8.5 * 1440
    expect(PAGE_SPEC.HEIGHT_TWIPS).toBe(15840) // 11 * 1440
  })
})

// ============================================
// CHARACTER COUNT TESTS
// ============================================

describe('Character Count Calculation', () => {
  it('should calculate sparse resume as under threshold', () => {
    const count = calculateCharCount(SPARSE_RESUME)
    expect(count).toBeLessThan(DENSITY_THRESHOLDS.SPARSE_MAX)
  })

  it('should calculate dense resume as over threshold', () => {
    const count = calculateCharCount(DENSE_RESUME)
    expect(count).toBeGreaterThan(DENSITY_THRESHOLDS.SPARSE_MAX)
  })

  it('should handle missing fields gracefully', () => {
    const minimal = { name: 'Test' }
    const count = calculateCharCount(minimal)
    expect(count).toBe(4) // 'Test'.length
  })

  it('should count GPA field', () => {
    const withGpa = { 
      name: 'Test',
      education: [{ gpa: '3.8' }]
    }
    const withoutGpa = { 
      name: 'Test',
      education: [{}]
    }
    expect(calculateCharCount(withGpa)).toBeGreaterThan(calculateCharCount(withoutGpa))
  })
})

// ============================================
// LAYOUT VARS TESTS
// ============================================

describe('Layout Variables', () => {
  it('should return cozy mode for sparse content', () => {
    const sparseCount = calculateCharCount(SPARSE_RESUME)
    const vars = getDefaultLayoutVars(sparseCount)
    expect(vars._mode).toBe('cozy')
    expect(vars.bodyFontSize).toBe(LAYOUT_BOUNDS.bodyFontSize.default_cozy)
    expect(vars.margins).toBe(LAYOUT_BOUNDS.margins.default_cozy)
  })

  it('should return compact mode for dense content', () => {
    const denseCount = calculateCharCount(DENSE_RESUME)
    const vars = getDefaultLayoutVars(denseCount)
    expect(vars._mode).toBe('compact')
    expect(vars.bodyFontSize).toBe(LAYOUT_BOUNDS.bodyFontSize.default_compact)
    expect(vars.margins).toBe(LAYOUT_BOUNDS.margins.default_compact)
  })

  it('should clamp layout vars within bounds', () => {
    const outOfBounds = {
      bodyFontSize: 100, // Way over max
      margins: 100, // Way under min
    }
    const clamped = clampLayoutVars(outOfBounds)
    expect(clamped.bodyFontSize).toBe(LAYOUT_BOUNDS.bodyFontSize.max)
    expect(clamped.margins).toBe(LAYOUT_BOUNDS.margins.min)
  })
})

// ============================================
// FIT CALCULATION TESTS
// ============================================

describe('Fit Percentage Calculation', () => {
  it('should return 100% for perfect fit', () => {
    expect(calculateFitPercent(1000, 1000)).toBe(100)
  })

  it('should return >100% for overflow', () => {
    expect(calculateFitPercent(1100, 1000)).toBe(110)
  })

  it('should return <100% for underfull', () => {
    expect(calculateFitPercent(800, 1000)).toBe(80)
  })

  it('should handle edge cases', () => {
    expect(calculateFitPercent(0, 1000)).toBe(0)
    expect(calculateFitPercent(1000, 0)).toBe(100) // Avoid division by zero
  })
})

describe('Fit Status', () => {
  it('should return "fit" within tolerance', () => {
    expect(getFitStatus(100)).toBe('fit')
    expect(getFitStatus(101)).toBe('fit') // Within 2% tolerance
    expect(getFitStatus(99)).toBe('fit')
  })

  it('should return "overflow" above tolerance', () => {
    expect(getFitStatus(105)).toBe('overflow')
    expect(getFitStatus(110)).toBe('overflow')
  })

  it('should return "underfull" below tolerance', () => {
    expect(getFitStatus(95)).toBe('underfull')
    expect(getFitStatus(80)).toBe('underfull')
  })
})

// ============================================
// CONTENT INTEGRITY TESTS
// ============================================

describe('Content Integrity (NO MUTATION)', () => {
  it('should not modify resume data when calculating char count', () => {
    const original = JSON.stringify(DENSE_RESUME)
    calculateCharCount(DENSE_RESUME)
    expect(JSON.stringify(DENSE_RESUME)).toBe(original)
  })

  it('should not modify resume data when getting layout vars', () => {
    const original = JSON.stringify(DENSE_RESUME)
    const count = calculateCharCount(DENSE_RESUME)
    getDefaultLayoutVars(count)
    expect(JSON.stringify(DENSE_RESUME)).toBe(original)
  })

  it('layoutVarsToDocx should not reference content', () => {
    // layoutVarsToDocx should only take layout vars, not resume data
    const layoutVars = getDefaultLayoutVars(1000)
    const docxConfig = layoutVarsToDocx(layoutVars)
    
    // Verify structure - should have MARGIN, FONT_SIZE, SPACING, LINE_HEIGHT
    expect(docxConfig).toHaveProperty('MARGIN')
    expect(docxConfig).toHaveProperty('FONT_SIZE')
    expect(docxConfig).toHaveProperty('SPACING')
    expect(docxConfig).toHaveProperty('LINE_HEIGHT')
    
    // Should not have any content-related properties
    expect(docxConfig).not.toHaveProperty('name')
    expect(docxConfig).not.toHaveProperty('experience')
    expect(docxConfig).not.toHaveProperty('education')
  })
})

// ============================================
// UI HELPER TESTS
// ============================================

describe('UI Helpers', () => {
  it('should return correct display text', () => {
    expect(getFitDisplayText(100, 'fit')).toBe('Fits (100%)')
    expect(getFitDisplayText(110, 'overflow')).toBe('Overflow (110%)')
    expect(getFitDisplayText(85, 'underfull')).toBe('Underfull (85%)')
  })

  it('should return correct colors', () => {
    expect(getFitStatusColor('fit')).toBe('#10b981')
    expect(getFitStatusColor('overflow')).toBe('#ef4444')
    expect(getFitStatusColor('underfull')).toBe('#f59e0b')
  })
})

// ============================================
// CONTENT HEIGHT CALCULATION TESTS
// ============================================

describe('Content Height Calculation', () => {
  it('should calculate content height based on margins', () => {
    const defaultMargin = LAYOUT_BOUNDS.margins.default_compact // 720 TWIPs = 0.5"
    const height = getContentHeightPx(defaultMargin)
    
    // Page height is 11" = 1056px at 96 DPI
    // With 0.5" margins on top and bottom = 48px each = 96px total
    // Content = 1056 - 96 - safetyBuffer
    const expectedApprox = 1056 - 96 - FIT_CONFIG.safetyBufferPx
    expect(height).toBeCloseTo(expectedApprox, 0)
  })

  it('should have less content height with larger margins', () => {
    const smallMargin = LAYOUT_BOUNDS.margins.min // 576 TWIPs
    const largeMargin = LAYOUT_BOUNDS.margins.max // 1440 TWIPs
    
    const smallMarginHeight = getContentHeightPx(smallMargin)
    const largeMarginHeight = getContentHeightPx(largeMargin)
    
    expect(smallMarginHeight).toBeGreaterThan(largeMarginHeight)
  })
})

// ============================================
// LAYOUT VARS TO DOCX CONVERSION
// ============================================

describe('Layout Vars to DOCX Conversion', () => {
  it('should convert layout vars to DOCX format', () => {
    const layoutVars = getDefaultLayoutVars(1000) // Sparse, will get cozy defaults
    const docx = layoutVarsToDocx(layoutVars)
    
    // Check all expected properties exist
    expect(docx.MARGIN).toBe(layoutVars.margins)
    expect(docx.FONT_SIZE.BODY).toBe(layoutVars.bodyFontSize)
    expect(docx.FONT_SIZE.NAME).toBe(layoutVars.nameFontSize)
    expect(docx.FONT_SIZE.SECTION_HEADER).toBe(layoutVars.sectionHeaderFontSize)
    expect(docx.SPACING.SECTION_BEFORE).toBe(layoutVars.sectionSpacingBefore)
    expect(docx.SPACING.SECTION_AFTER).toBe(layoutVars.sectionSpacingAfter)
    expect(docx.SPACING.ROLE_GAP).toBe(layoutVars.roleGap)
    expect(docx.SPACING.BULLET_AFTER).toBe(layoutVars.bulletSpacing)
    expect(docx.LINE_HEIGHT).toBe(layoutVars.lineHeight)
  })
})

// ============================================
// SNAPSHOT TESTS FOR DETERMINISTIC LAYOUT
// ============================================

describe('Deterministic Layout Snapshots', () => {
  it('should produce consistent cozy layout for sparse content', () => {
    const vars = getDefaultLayoutVars(500) // Very sparse
    expect(vars).toMatchSnapshot('cozy-layout')
  })

  it('should produce consistent compact layout for dense content', () => {
    const vars = getDefaultLayoutVars(5000) // Very dense
    expect(vars).toMatchSnapshot('compact-layout')
  })
})
