import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  LevelFormat,
  BorderStyle,
  TabStopType
} from 'docx'
import { saveAs } from 'file-saver'
import { validateResumeData, logValidationErrors, autoFixResumeData } from './resumeValidator'
import { 
  calculateCharCount, 
  getDefaultLayoutVars, 
  DENSITY_THRESHOLDS,
  LAYOUT_BOUNDS,
  clampLayoutVars,
} from '../pageFit/pageFitConfig.js'
import { measureResumeHeightWithVars } from './resumeMeasurer'

// ============================================
// ADAPTIVE LAYOUT SYSTEM
// ============================================

/**
 * Get layout styles based on content density and PageFit results
 * This implements the "Adaptive Layout" engine that scales based on content amount
 * 
 * @param {Object} resumeData - Resume data to measure
 * @param {Object} overrideVars - Optional layout variable overrides from PageFit
 * @returns {Object} - Layout configuration for DOCX generation
 */
function getAdaptiveLayout(resumeData, overrideVars = null) {
  // Calculate content density
  const charCount = calculateCharCount(resumeData)
  const isCozy = charCount < DENSITY_THRESHOLDS.SPARSE_MAX
  
  console.log(`📐 Layout Mode: ${isCozy ? 'COZY' : 'COMPACT'} (${charCount} chars)`)
  
  // Get default layout vars based on density
  const layoutVars = overrideVars ? clampLayoutVars(overrideVars) : getDefaultLayoutVars(charCount)
  
  // Calculate right tab position based on margins
  // Letter width: 8.5" = 12240 TWIPs - left margin - right margin
  const rightTabPosition = 12240 - (layoutVars.margins * 2)
  
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
    RIGHT_TAB_POSITION: rightTabPosition,
    _mode: isCozy ? 'cozy' : 'compact',
    _charCount: charCount,
    _layoutVars: layoutVars, // Keep original for PageFit iterations
  }
}

// Font family - CBS Resume Standards require Times New Roman
const FONT_FAMILY = 'Times New Roman'

// ============================================
// PAGEFIT LOOP - Layout-Only Fitting
// ============================================

/**
 * PageFit Loop: Iteratively adjust layout to fit content on one page
 * 
 * NON-NEGOTIABLE: This function NEVER modifies content.
 * It only adjusts layout parameters (fonts, spacing, margins).
 * 
 * @param {Object} resumeData - Resume content (READ-ONLY)
 * @param {Object} initialLayout - Initial layout configuration
 * @returns {Object} - Optimized layout configuration
 */
async function runPageFitLoop(resumeData, initialLayout) {
  const maxIterations = 10
  let layout = { ...initialLayout }
  let layoutVars = { ...layout._layoutVars }
  
  // Measure initial height
  let height = measureResumeHeightWithVars(resumeData, layoutVars)
  const contentLimit = getContentLimitPx(layoutVars.margins)
  
  console.log(`📏 Initial: ${height}px / ${contentLimit}px (${Math.round(height / contentLimit * 100)}%)`)
  
  // If already fits, we're done
  if (height <= contentLimit) {
    // Check if significantly underfull (less than 85%)
    const fillPercent = (height / contentLimit) * 100
    if (fillPercent < 85) {
      console.log(`📏 Underfull (${Math.round(fillPercent)}%), expanding layout...`)
      layoutVars = expandLayout(layoutVars, height, contentLimit)
      layout = getAdaptiveLayout(resumeData, layoutVars)
    }
    return layout
  }
  
  // Overflow: need to compress layout
  console.log('📏 Overflow detected, compressing layout...')
  
  for (let i = 0; i < maxIterations; i++) {
    // Try compressing layout vars
    const newLayoutVars = compressLayoutStep(layoutVars)
    
    // If no more compression possible, stop
    if (!newLayoutVars) {
      console.log(`📏 No more layout compression possible at iteration ${i + 1}`)
      break
    }
    
    layoutVars = newLayoutVars
    height = measureResumeHeightWithVars(resumeData, layoutVars)
    const newContentLimit = getContentLimitPx(layoutVars.margins)
    
    console.log(`📏 Iteration ${i + 1}: ${height}px / ${newContentLimit}px (${Math.round(height / newContentLimit * 100)}%)`)
    
    if (height <= newContentLimit) {
      console.log('✅ PageFit achieved through layout adjustment!')
      break
    }
  }
  
  // Return the optimized layout
  return getAdaptiveLayout(resumeData, layoutVars)
}

/**
 * Calculate available content height based on margins
 * @param {number} marginTwips - Margin in TWIPs
 * @returns {number} - Available height in pixels
 */
function getContentLimitPx(marginTwips) {
  const DPI = 96
  const PAGE_HEIGHT_PX = 11 * DPI // 1056px
  const marginPx = (marginTwips / 1440) * DPI
  const safetyBuffer = 20 // Safety margin for DOCX rendering differences
  return PAGE_HEIGHT_PX - (marginPx * 2) - safetyBuffer
}

/**
 * Compress layout by one step (reduce spacing/fonts within bounds)
 * Priority order: spacing first, then fonts, then margins
 * 
 * @param {Object} layoutVars - Current layout variables
 * @returns {Object|null} - New layout vars, or null if at minimum
 */
function compressLayoutStep(layoutVars) {
  const vars = { ...layoutVars }
  
  // Priority order for compression
  const compressionOrder = [
    { key: 'bulletSpacing', bound: LAYOUT_BOUNDS.bulletSpacing },
    { key: 'roleGap', bound: LAYOUT_BOUNDS.roleGap },
    { key: 'sectionSpacingAfter', bound: LAYOUT_BOUNDS.sectionSpacingAfter },
    { key: 'sectionSpacingBefore', bound: LAYOUT_BOUNDS.sectionSpacingBefore },
    { key: 'contactSpacingAfter', bound: LAYOUT_BOUNDS.contactSpacingAfter },
    { key: 'nameSpacingAfter', bound: LAYOUT_BOUNDS.nameSpacingAfter },
    { key: 'lineHeight', bound: LAYOUT_BOUNDS.lineHeight },
    { key: 'bodyFontSize', bound: LAYOUT_BOUNDS.bodyFontSize },
    { key: 'sectionHeaderFontSize', bound: LAYOUT_BOUNDS.sectionHeaderFontSize },
    { key: 'nameFontSize', bound: LAYOUT_BOUNDS.nameFontSize },
    { key: 'margins', bound: LAYOUT_BOUNDS.margins },
  ]
  
  for (const { key, bound } of compressionOrder) {
    const current = vars[key]
    const newValue = current - bound.step
    
    if (newValue >= bound.min) {
      vars[key] = newValue
      return vars
    }
  }
  
  // All at minimum, no more compression possible
  return null
}

/**
 * Expand layout to fill underfull page
 * 
 * @param {Object} layoutVars - Current layout variables
 * @param {number} currentHeight - Current content height
 * @param {number} targetHeight - Target content height
 * @returns {Object} - Expanded layout vars
 */
function expandLayout(layoutVars, currentHeight, targetHeight) {
  const vars = { ...layoutVars }
  const expansionRatio = targetHeight / currentHeight
  
  // Only expand spacing, not fonts (fonts at comfortable size is good)
  const expansionOrder = [
    { key: 'roleGap', bound: LAYOUT_BOUNDS.roleGap },
    { key: 'sectionSpacingBefore', bound: LAYOUT_BOUNDS.sectionSpacingBefore },
    { key: 'sectionSpacingAfter', bound: LAYOUT_BOUNDS.sectionSpacingAfter },
    { key: 'bulletSpacing', bound: LAYOUT_BOUNDS.bulletSpacing },
    { key: 'lineHeight', bound: LAYOUT_BOUNDS.lineHeight },
  ]
  
  // Expand each spacing proportionally, up to max bounds
  for (const { key, bound } of expansionOrder) {
    const current = vars[key]
    const expanded = Math.min(
      bound.max,
      Math.round(current * Math.min(1.2, expansionRatio)) // Cap at 20% expansion
    )
    vars[key] = expanded
  }
  
  return vars
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Convert string to Title Case
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
 * Latin honors that should be lowercase and italicized per CBS standards
 */
const LATIN_HONORS = [
  'summa cum laude',
  'magna cum laude', 
  'cum laude'
]

/**
 * Check if text contains Latin honors and format appropriately
 * Returns array of TextRun objects with proper formatting
 */
function formatTextWithLatinHonors(text, baseSize, baseFont) {
  if (!text) return []
  
  let remainingText = text
  const runs = []
  
  // Check for each Latin honor phrase
  for (const honor of LATIN_HONORS) {
    const lowerText = remainingText.toLowerCase()
    const honorIndex = lowerText.indexOf(honor)
    
    if (honorIndex !== -1) {
      // Add text before the honor
      if (honorIndex > 0) {
        runs.push(new TextRun({
          text: remainingText.substring(0, honorIndex),
          size: baseSize,
          font: baseFont,
          italics: true
        }))
      }
      
      // Add the Latin honor in lowercase and italics
      runs.push(new TextRun({
        text: honor, // Always lowercase
        size: baseSize,
        font: baseFont,
        italics: true
      }))
      
      // Continue with remaining text
      remainingText = remainingText.substring(honorIndex + honor.length)
    }
  }
  
  // Add any remaining text
  if (remainingText.length > 0) {
    runs.push(new TextRun({
      text: remainingText,
      size: baseSize,
      font: baseFont,
      italics: true
    }))
  }
  
  return runs.length > 0 ? runs : [new TextRun({
    text: text,
    size: baseSize,
    font: baseFont,
    italics: true
  })]
}

/**
 * Create a section header with bottom border
 * @param {string} title - Section title
 * @param {Object} layout - Layout configuration from getAdaptiveLayout
 */
function createSectionHeader(title, layout) {
  return new Paragraph({
    children: [
      new TextRun({
        text: title.toUpperCase(),
        bold: true,
        size: layout.FONT_SIZE.SECTION_HEADER,
        font: FONT_FAMILY
      })
    ],
    spacing: { 
      before: layout.SPACING.SECTION_BEFORE, 
      after: layout.SPACING.SECTION_AFTER 
    },
    border: {
      bottom: {
        color: '000000',
        space: 1,
        style: BorderStyle.SINGLE,
        size: 6
      }
    }
  })
}

/**
 * Create a bullet point paragraph with tight spacing
 * @param {string} text - Bullet text
 * @param {Object} layout - Layout configuration from getAdaptiveLayout
 * @param {boolean} isLast - Whether this is the last bullet in a section
 */
function createBulletParagraph(text, layout, isLast = false) {
  return new Paragraph({
    numbering: {
      reference: 'resume-bullets',
      level: 0
    },
    children: [
      new TextRun({
        text: text,
        size: layout.FONT_SIZE.BULLET,
        font: FONT_FAMILY
      })
    ],
    spacing: { 
      after: isLast ? layout.SPACING.ROLE_GAP : layout.SPACING.BULLET_AFTER,
      line: layout.LINE_HEIGHT
    }
  })
}

// ============================================
// MAIN EXPORT FUNCTION
// ============================================

export async function generateDOCX(resumeData, filename = null, companyName = null, layoutOverrides = null) {
  // Auto-generate filename if not provided
  if (!filename) {
    const nameParts = resumeData.name.trim().split(' ')
    const lastName = nameParts[nameParts.length - 1].toUpperCase()
    const firstName = nameParts[0].toUpperCase()
    
    if (companyName) {
      // For tailored resumes: LASTNAME_FIRSTNAME_COMPANY.docx
      const cleanCompany = companyName.toUpperCase().replace(/[^A-Z0-9]/g, '')
      filename = `${lastName}_${firstName}_${cleanCompany}.docx`
    } else {
      // For primary resumes
      filename = `${lastName}_${firstName}_RESUME.docx`
    }
  }

  // STEP 1: Validate resume data for broken output
  console.log('🔍 Validating resume data...')
  const validation = validateResumeData(resumeData)
  logValidationErrors(validation)
  
  // Auto-fix common issues if validation failed
  let cleanedData = resumeData
  if (!validation.valid) {
    console.warn('⚠️ Attempting to auto-fix issues...')
    cleanedData = autoFixResumeData(resumeData)
    
    // Re-validate
    const revalidation = validateResumeData(cleanedData)
    if (!revalidation.valid) {
      console.error('❌ Auto-fix failed. Some issues remain.')
      logValidationErrors(revalidation)
    } else {
      console.log('✅ Auto-fix successful!')
    }
  }
  
  // STEP 2: Get adaptive layout based on content density
  // PageFit adjusts ONLY layout parameters, NEVER content
  console.log('📐 Calculating adaptive layout...')
  let layout = getAdaptiveLayout(cleanedData, layoutOverrides)
  
  // STEP 3: PageFit - Iteratively adjust layout to fit one page
  // This loop adjusts ONLY layout variables, NEVER modifies content
  console.log('📏 Running PageFit (layout-only fitting)...')
  layout = await runPageFitLoop(cleanedData, layout)
  
  // Content is frozen - we only use cleanedData from here, never modify it
  const onePageData = cleanedData
  
  // Build document content using adaptive layout
  const docChildren = []

  // ---- HEADER: Name (adaptive size, title case, bold, centered) ----
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: toTitleCase(onePageData.name),
          bold: true,
          size: layout.FONT_SIZE.NAME,
          font: FONT_FAMILY
        })
      ],
      spacing: { after: layout.SPACING.NAME_AFTER }
    })
  )

  // ---- CONTACT INFO (adaptive size, single line with |, centered) ----
  const contactParts = [
    onePageData.contact?.phone,
    onePageData.contact?.email,
    onePageData.contact?.linkedin
  ].filter(Boolean)
  
  if (contactParts.length > 0) {
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: contactParts.join(' | '),
            size: layout.FONT_SIZE.CONTACT,
            font: FONT_FAMILY
          })
        ],
        spacing: { after: layout.SPACING.CONTACT_AFTER }
      })
    )
  }

  // ---- SUMMARY SECTION (if present) ----
  if (onePageData.summary) {
    docChildren.push(createSectionHeader('Summary', layout))
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: onePageData.summary,
            size: layout.FONT_SIZE.BODY,
            font: FONT_FAMILY
          })
        ],
        spacing: { after: layout.SPACING.ROLE_GAP, line: layout.LINE_HEIGHT },
        alignment: AlignmentType.JUSTIFIED
      })
    )
  }

  // ---- EDUCATION SECTION ----
  if (onePageData.education && onePageData.education.length > 0) {
    docChildren.push(createSectionHeader('Education', layout))
    docChildren.push(...generateEducationSection(onePageData.education, layout))
  }

  // ---- EXPERIENCE SECTION ----
  if (onePageData.experience && onePageData.experience.length > 0) {
    docChildren.push(createSectionHeader('Experience', layout))
    docChildren.push(...generateExperienceSection(onePageData.experience, layout))
  }

  // ---- SKILLS SECTION (compact, no extra label) ----
  if (onePageData.skills) {
    docChildren.push(...generateSkillsSection(onePageData.skills, layout))
  }

  // ---- ADDITIONAL SECTION (if present) ----
  if (onePageData.additional) {
    docChildren.push(createSectionHeader('Additional', layout))
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: onePageData.additional,
            size: layout.FONT_SIZE.BODY,
            font: FONT_FAMILY
          })
        ],
        spacing: { after: layout.SPACING.ROLE_GAP, line: layout.LINE_HEIGHT }
      })
    )
  }

  // ---- CUSTOM SECTIONS (Awards, Volunteering, etc.) ----
  if (onePageData.custom_sections && onePageData.custom_sections.length > 0) {
    docChildren.push(...generateCustomSections(onePageData.custom_sections, layout))
  }

  // Create the document with adaptive layout margins
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT_FAMILY,
            size: layout.FONT_SIZE.BODY
          }
        }
      }
    },
    numbering: {
      config: [
        {
          reference: 'resume-bullets',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '•',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: 280, hanging: 180 }
                }
              }
            }
          ]
        }
      ]
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 12240,  // US Letter width in TWIPs (8.5")
              height: 15840  // US Letter height in TWIPs (11")
            },
            margin: {
              top: layout.MARGIN,
              right: layout.MARGIN,
              bottom: layout.MARGIN,
              left: layout.MARGIN
            }
          }
        },
        children: docChildren
      }
    ]
  })
  
  console.log(`✅ Document generated with ${layout._mode} layout (margins: ${layout.MARGIN} TWIPs, body font: ${layout.FONT_SIZE.BODY/2}pt)`)

  // Generate and save
  const blob = await Packer.toBlob(doc)
  saveAs(blob, filename)
}

// ============================================
// SECTION GENERATORS
// ============================================

/**
 * Generate education entries with dates right-aligned on institution line
 * Supports separate GPA field for cleaner formatting
 * 
 * @param {Array} education - Education entries
 * @param {Object} layout - Layout configuration from getAdaptiveLayout
 */
function generateEducationSection(education, layout) {
  if (!education || education.length === 0) return []

  const elements = []

  education.forEach((edu, index) => {
    const isLast = index === education.length - 1
    // Check if we have GPA or details
    const hasGpa = edu.gpa && edu.gpa.trim()
    const hasDetails = edu.details && edu.details.trim()
    const hasAdditionalInfo = hasGpa || hasDetails

    // Line 1: Institution (left) + Dates (right-aligned)
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: edu.institution.toUpperCase(),
            bold: true,
            size: layout.FONT_SIZE.COMPANY_TITLE,
            font: FONT_FAMILY
          }),
          new TextRun({ text: '\t' }),
          new TextRun({
            text: edu.dates || '',
            size: layout.FONT_SIZE.BODY,
            font: FONT_FAMILY
          })
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: layout.RIGHT_TAB_POSITION }],
        spacing: { after: 0, line: layout.LINE_HEIGHT }
      })
    )

    // Line 2: Degree (left) + Location (right-aligned)
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: edu.degree || '',
            size: layout.FONT_SIZE.BODY,
            font: FONT_FAMILY
          }),
          new TextRun({ text: '\t' }),
          new TextRun({
            text: edu.location || '',
            size: layout.FONT_SIZE.BODY,
            font: FONT_FAMILY,
            italics: true
          })
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: layout.RIGHT_TAB_POSITION }],
        spacing: { after: hasAdditionalInfo ? 0 : (isLast ? layout.SPACING.ROLE_GAP : layout.SPACING.ROLE_GAP / 2), line: layout.LINE_HEIGHT }
      })
    )

    // Line 3: GPA (if provided as separate field)
    // Format: "GPA: 3.74/4.0" with label bold and value normal
    if (hasGpa) {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'GPA: ',
              bold: true,
              size: layout.FONT_SIZE.BODY,
              font: FONT_FAMILY
            }),
            new TextRun({
              text: edu.gpa,
              size: layout.FONT_SIZE.BODY,
              font: FONT_FAMILY
            })
          ],
          spacing: { after: hasDetails ? 0 : (isLast ? layout.SPACING.ROLE_GAP : layout.SPACING.ROLE_GAP / 2), line: layout.LINE_HEIGHT }
        })
      )
    }

    // Line 4: Additional details (honors, activities, etc.)
    // CBS Standard: Latin honors must be lowercase and italicized
    if (hasDetails) {
      elements.push(
        new Paragraph({
          children: formatTextWithLatinHonors(edu.details, layout.FONT_SIZE.BODY, FONT_FAMILY),
          spacing: { after: isLast ? layout.SPACING.ROLE_GAP : layout.SPACING.ROLE_GAP / 2, line: layout.LINE_HEIGHT }
        })
      )
    }
  })

  return elements
}

/**
 * Generate experience entries with dates right-aligned on company line
 * 
 * @param {Array} experience - Experience entries
 * @param {Object} layout - Layout configuration from getAdaptiveLayout
 */
function generateExperienceSection(experience, layout) {
  if (!experience || experience.length === 0) return []

  const elements = []

  experience.forEach((exp, index) => {
    const isLast = index === experience.length - 1

    // Line 1: Company (left) + Dates (right-aligned)
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: exp.company.toUpperCase(),
            bold: true,
            size: layout.FONT_SIZE.COMPANY_TITLE,
            font: FONT_FAMILY
          }),
          new TextRun({ text: '\t' }),
          new TextRun({
            text: exp.dates || '',
            size: layout.FONT_SIZE.BODY,
            font: FONT_FAMILY
          })
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: layout.RIGHT_TAB_POSITION }],
        spacing: { after: 0, line: layout.LINE_HEIGHT }
      })
    )

    // Line 2: Title (left) + Location (right-aligned)
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: exp.title || '',
            size: layout.FONT_SIZE.BODY,
            font: FONT_FAMILY,
            italics: true
          }),
          new TextRun({ text: '\t' }),
          new TextRun({
            text: exp.location || '',
            size: layout.FONT_SIZE.BODY,
            font: FONT_FAMILY
          })
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: layout.RIGHT_TAB_POSITION }],
        spacing: { after: exp.bullets && exp.bullets.length > 0 ? 0 : layout.SPACING.ROLE_GAP, line: layout.LINE_HEIGHT }
      })
    )

    // Bullets with tight spacing
    if (exp.bullets && exp.bullets.length > 0) {
      exp.bullets.forEach((bullet, bulletIndex) => {
        const isLastBullet = bulletIndex === exp.bullets.length - 1
        elements.push(createBulletParagraph(bullet, layout, isLastBullet && !isLast ? false : isLastBullet))
      })
      
      // Add small gap after the last bullet of each role (except the very last role)
      if (!isLast) {
        // The spacing is handled in createBulletParagraph via isLast param
        // But we need a bit more gap between roles
        elements[elements.length - 1] = createBulletParagraph(
          exp.bullets[exp.bullets.length - 1], 
          layout,
          true
        )
      }
    }
  })

  return elements
}

/**
 * Generate skills section - just the skills, no extra label
 * 
 * @param {string} skills - Skills text
 * @param {Object} layout - Layout configuration from getAdaptiveLayout
 */
function generateSkillsSection(skills, layout) {
  // Clean the skills text - remove any "Technical & Software:" prefix
  let cleanSkills = skills
  const prefixesToRemove = [
    /^Technical\s*&?\s*Software\s*:?\s*/i,
    /^Technical Skills\s*:?\s*/i,
    /^Skills\s*:?\s*/i
  ]
  
  for (const prefix of prefixesToRemove) {
    cleanSkills = cleanSkills.replace(prefix, '')
  }

  return [
    createSectionHeader('Skills', layout),
    new Paragraph({
      children: [
        new TextRun({
          text: cleanSkills.trim(),
          size: layout.FONT_SIZE.BODY,
          font: FONT_FAMILY
        })
      ],
      spacing: { after: layout.SPACING.ROLE_GAP, line: layout.LINE_HEIGHT }
    })
  ]
}

/**
 * Generate custom sections (Awards, Volunteering, Additional Experience, etc.)
 * Formats compactly - single-line entries when content is short
 * 
 * @param {Array} customSections - Custom section entries
 * @param {Object} layout - Layout configuration from getAdaptiveLayout
 */
function generateCustomSections(customSections, layout) {
  if (!customSections || customSections.length === 0) return []

  const elements = []

  customSections.forEach((section) => {
    elements.push(createSectionHeader(section.title, layout))

    if (section.content && section.content.length > 0) {
      // Check if entries are short enough for single-line formatting
      const isCompactSection = section.content.every(item => item.length < 80)
      
      if (isCompactSection && section.content.length <= 4) {
        // Single-line format: join with semicolons or bullets inline
        elements.push(
          new Paragraph({
            children: [
              new TextRun({
                text: section.content.join(' • '),
                size: layout.FONT_SIZE.BODY,
                font: FONT_FAMILY
              })
            ],
            spacing: { after: layout.SPACING.ROLE_GAP, line: layout.LINE_HEIGHT }
          })
        )
      } else {
        // Standard bullet format with tight spacing
        section.content.forEach((item, itemIndex) => {
          const isLastItem = itemIndex === section.content.length - 1
          elements.push(createBulletParagraph(item, layout, isLastItem))
        })
      }
    }
  })

  return elements
}
