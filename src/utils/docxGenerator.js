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
import { ensureOnePage } from './resumeMeasurer'
import { validateResumeData, logValidationErrors, autoFixResumeData } from './resumeValidator'

// ============================================
// STYLE CONSTANTS - One-Page Optimized Layout
// ============================================

// Margins: 0.5 inches (720 TWIPs) on all sides
const MARGIN = 720

// Font sizes (in half-points, so multiply pt by 2)
// CBS Standard: 10-12pt font, with name slightly larger but not excessive
const FONT_SIZE = {
  NAME: 28,           // 14pt (CBS-appropriate, was 24pt which was too large)
  CONTACT: 20,        // 10pt
  SECTION_HEADER: 24, // 12pt
  BODY: 20,           // 10pt
  COMPANY_TITLE: 20,  // 10pt
  BULLET: 20          // 10pt
}

// Spacing (in TWIPs: 1pt = 20 TWIPs)
const SPACING = {
  SECTION_BEFORE: 120,    // 6pt before section headers
  SECTION_AFTER: 40,      // 2pt after section headers
  ROLE_GAP: 80,           // 4pt between roles
  BULLET_AFTER: 0,        // 0pt between bullet items (single spacing)
  CONTACT_AFTER: 80,      // 4pt after contact
  NAME_AFTER: 40          // 2pt after name
}

// Font family - CBS Resume Standards require Times New Roman
const FONT_FAMILY = 'Times New Roman'

// Tab position for right-aligned dates (calculated for 0.5" margins on letter paper)
// Letter width: 8.5" - 0.5" left - 0.5" right = 7.5" content area = 10800 TWIPs
const RIGHT_TAB_POSITION = 10800

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
 */
function createSectionHeader(title) {
  return new Paragraph({
    children: [
      new TextRun({
        text: title.toUpperCase(),
        bold: true,
        size: FONT_SIZE.SECTION_HEADER,
        font: FONT_FAMILY
      })
    ],
    spacing: { 
      before: SPACING.SECTION_BEFORE, 
      after: SPACING.SECTION_AFTER 
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
 */
function createBulletParagraph(text, isLast = false) {
  return new Paragraph({
    numbering: {
      reference: 'resume-bullets',
      level: 0
    },
    children: [
      new TextRun({
        text: text,
        size: FONT_SIZE.BULLET,
        font: FONT_FAMILY
      })
    ],
    spacing: { 
      after: isLast ? SPACING.ROLE_GAP : SPACING.BULLET_AFTER,
      line: 240 // Single spacing (240 = 1.0 line height)
    }
  })
}

// ============================================
// MAIN EXPORT FUNCTION
// ============================================

export async function generateDOCX(resumeData, filename = null, companyName = null) {
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
  
  // STEP 2: Ensure resume fits on one page using render → measure → compress loop
  console.log('📏 Measuring resume and ensuring one-page fit...')
  const onePageData = await ensureOnePage(cleanedData)
  
  // Build document content
  const docChildren = []

  // ---- HEADER: Name (24pt, title case, bold, centered) ----
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: toTitleCase(onePageData.name),
          bold: true,
          size: FONT_SIZE.NAME,
          font: FONT_FAMILY
        })
      ],
      spacing: { after: SPACING.NAME_AFTER }
    })
  )

  // ---- CONTACT INFO (10pt, single line with |, centered) ----
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
            size: FONT_SIZE.CONTACT,
            font: FONT_FAMILY
          })
        ],
        spacing: { after: SPACING.CONTACT_AFTER }
      })
    )
  }

  // ---- SUMMARY SECTION (if present) ----
  if (onePageData.summary) {
    docChildren.push(createSectionHeader('Summary'))
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: onePageData.summary,
            size: FONT_SIZE.BODY,
            font: FONT_FAMILY
          })
        ],
        spacing: { after: SPACING.ROLE_GAP },
        alignment: AlignmentType.JUSTIFIED
      })
    )
  }

  // ---- EDUCATION SECTION ----
  if (onePageData.education && onePageData.education.length > 0) {
    docChildren.push(createSectionHeader('Education'))
    docChildren.push(...generateEducationSection(onePageData.education))
  }

  // ---- EXPERIENCE SECTION ----
  if (onePageData.experience && onePageData.experience.length > 0) {
    docChildren.push(createSectionHeader('Experience'))
    docChildren.push(...generateExperienceSection(onePageData.experience))
  }

  // ---- SKILLS SECTION (compact, no extra label) ----
  if (onePageData.skills) {
    docChildren.push(...generateSkillsSection(onePageData.skills))
  }

  // ---- ADDITIONAL SECTION (if present) ----
  if (onePageData.additional) {
    docChildren.push(createSectionHeader('Additional'))
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: onePageData.additional,
            size: FONT_SIZE.BODY,
            font: FONT_FAMILY
          })
        ],
        spacing: { after: SPACING.ROLE_GAP }
      })
    )
  }

  // ---- CUSTOM SECTIONS (Awards, Volunteering, etc.) ----
  if (onePageData.custom_sections && onePageData.custom_sections.length > 0) {
    docChildren.push(...generateCustomSections(onePageData.custom_sections))
  }

  // Create the document
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT_FAMILY,
            size: FONT_SIZE.BODY
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
              top: MARGIN,
              right: MARGIN,
              bottom: MARGIN,
              left: MARGIN
            }
          }
        },
        children: docChildren
      }
    ]
  })

  // Generate and save
  const blob = await Packer.toBlob(doc)
  saveAs(blob, filename)
}

// ============================================
// SECTION GENERATORS
// ============================================

/**
 * Generate education entries with dates right-aligned on institution line
 */
function generateEducationSection(education) {
  if (!education || education.length === 0) return []

  const elements = []

  education.forEach((edu, index) => {
    const isLast = index === education.length - 1

    // Line 1: Institution (left) + Dates (right-aligned)
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: edu.institution.toUpperCase(),
            bold: true,
            size: FONT_SIZE.COMPANY_TITLE,
            font: FONT_FAMILY
          }),
          new TextRun({ text: '\t' }),
          new TextRun({
            text: edu.dates || '',
            size: FONT_SIZE.BODY,
            font: FONT_FAMILY
          })
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB_POSITION }],
        spacing: { after: 0 }
      })
    )

    // Line 2: Degree (left) + Location (right-aligned)
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: edu.degree || '',
            size: FONT_SIZE.BODY,
            font: FONT_FAMILY
          }),
          new TextRun({ text: '\t' }),
          new TextRun({
            text: edu.location || '',
            size: FONT_SIZE.BODY,
            font: FONT_FAMILY,
            italics: true
          })
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB_POSITION }],
        spacing: { after: edu.details ? 0 : (isLast ? SPACING.ROLE_GAP : SPACING.ROLE_GAP / 2) }
      })
    )

    // Optional details line (GPA, honors, etc.)
    // CBS Standard: Latin honors must be lowercase and italicized
    if (edu.details) {
      elements.push(
        new Paragraph({
          children: formatTextWithLatinHonors(edu.details, FONT_SIZE.BODY, FONT_FAMILY),
          spacing: { after: isLast ? SPACING.ROLE_GAP : SPACING.ROLE_GAP / 2 }
        })
      )
    }
  })

  return elements
}

/**
 * Generate experience entries with dates right-aligned on company line
 */
function generateExperienceSection(experience) {
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
            size: FONT_SIZE.COMPANY_TITLE,
            font: FONT_FAMILY
          }),
          new TextRun({ text: '\t' }),
          new TextRun({
            text: exp.dates || '',
            size: FONT_SIZE.BODY,
            font: FONT_FAMILY
          })
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB_POSITION }],
        spacing: { after: 0 }
      })
    )

    // Line 2: Title (left) + Location (right-aligned)
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: exp.title || '',
            size: FONT_SIZE.BODY,
            font: FONT_FAMILY,
            italics: true
          }),
          new TextRun({ text: '\t' }),
          new TextRun({
            text: exp.location || '',
            size: FONT_SIZE.BODY,
            font: FONT_FAMILY
          })
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB_POSITION }],
        spacing: { after: exp.bullets && exp.bullets.length > 0 ? 0 : SPACING.ROLE_GAP }
      })
    )

    // Bullets with tight spacing
    if (exp.bullets && exp.bullets.length > 0) {
      exp.bullets.forEach((bullet, bulletIndex) => {
        const isLastBullet = bulletIndex === exp.bullets.length - 1
        elements.push(createBulletParagraph(bullet, isLastBullet && !isLast ? false : isLastBullet))
      })
      
      // Add small gap after the last bullet of each role (except the very last role)
      if (!isLast) {
        // The spacing is handled in createBulletParagraph via isLast param
        // But we need a bit more gap between roles
        elements[elements.length - 1] = createBulletParagraph(
          exp.bullets[exp.bullets.length - 1], 
          true
        )
      }
    }
  })

  return elements
}

/**
 * Generate skills section - just the skills, no extra label
 */
function generateSkillsSection(skills) {
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
    createSectionHeader('Skills'),
    new Paragraph({
      children: [
        new TextRun({
          text: cleanSkills.trim(),
          size: FONT_SIZE.BODY,
          font: FONT_FAMILY
        })
      ],
      spacing: { after: SPACING.ROLE_GAP }
    })
  ]
}

/**
 * Generate custom sections (Awards, Volunteering, Additional Experience, etc.)
 * Formats compactly - single-line entries when content is short
 */
function generateCustomSections(customSections) {
  if (!customSections || customSections.length === 0) return []

  const elements = []

  customSections.forEach((section) => {
    elements.push(createSectionHeader(section.title))

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
                size: FONT_SIZE.BODY,
                font: FONT_FAMILY
              })
            ],
            spacing: { after: SPACING.ROLE_GAP }
          })
        )
      } else {
        // Standard bullet format with tight spacing
        section.content.forEach((item, itemIndex) => {
          const isLastItem = itemIndex === section.content.length - 1
          elements.push(createBulletParagraph(item, isLastItem))
        })
      }
    }
  })

  return elements
}
