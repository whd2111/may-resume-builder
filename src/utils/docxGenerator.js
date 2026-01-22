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
  // Create the document with US Letter page size
  const rightTabPosition = 10800
  const lineLimiter = createLineLimiter(50)
  const docChildren = []

  const pushParagraph = (paragraph, lineCost, { force = false } = {}) => {
    if (force || lineLimiter.canFit(lineCost)) {
      docChildren.push(paragraph)
      lineLimiter.consume(lineCost)
    }
  }

  // Header: Name
  pushParagraph(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: resumeData.name.toUpperCase(),
          bold: true,
          size: 24 // 12pt for name
        })
      ],
      spacing: { after: 60 }
    }),
    1,
    { force: true }
  )

  // Contact info
  pushParagraph(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: `${resumeData.contact.phone} | ${resumeData.contact.email}`,
          size: 20 // 10pt
        })
      ],
      spacing: { after: 180 }
    }),
    1,
    { force: true }
  )

  // Education Section Header
  pushParagraph(
    new Paragraph({
      children: [
        new TextRun({
          text: 'EDUCATION',
          bold: true,
          size: 20
        })
      ],
      spacing: { after: 80 },
      border: {
        bottom: {
          color: '000000',
          space: 1,
          style: BorderStyle.SINGLE,
          size: 6
        }
      }
    }),
    1,
    { force: true }
  )

  // Education entries
  docChildren.push(
    ...generateEducationSection(resumeData.education, rightTabPosition, lineLimiter)
  )

  // Experience Section Header
  if (lineLimiter.canFit(1)) {
    pushParagraph(
      new Paragraph({
        children: [
          new TextRun({
            text: 'EXPERIENCE',
            bold: true,
            size: 20
          })
        ],
        spacing: { before: 180, after: 100 },
        border: {
          bottom: {
            color: '000000',
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6
          }
        }
      }),
      1
    )
  }

  // Experience entries
  docChildren.push(
    ...generateExperienceSection(resumeData.experience, rightTabPosition, lineLimiter)
  )

  // Skills/Additional Info Section
  docChildren.push(
    ...(resumeData.skills
      ? generateSkillsSection(resumeData.skills, lineLimiter)
      : [])
  )

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Times New Roman',
            size: 20 // 10pt (half-points, so 20 = 10pt)
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
                  indent: { left: 360, hanging: 200 }
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
              width: 12240, // US Letter width in DXA
              height: 15840 // US Letter height in DXA
            },
            margin: {
              top: 720,    // 0.5 inch
              right: 720,  // 0.5 inch
              bottom: 720, // 0.5 inch
              left: 720    // 0.5 inch
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

function generateEducationSection(education, rightTabPosition, lineLimiter) {
  if (!education || education.length === 0) return []

  const elements = []

  for (const edu of education) {
    if (!lineLimiter.canFit(2)) break
    // Institution name (left) and location (right) on same line
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: edu.institution.toUpperCase(),
            bold: true,
            size: 22
          }),
          new TextRun({
            text: '\t',
            size: 22
          }),
          new TextRun({
            text: edu.location,
            size: 22
          })
        ],
        tabStops: [
          {
            type: TabStopType.RIGHT,
            position: rightTabPosition
          }
        ],
        spacing: { before: 120, after: 60 }
      })
    )
    lineLimiter.consume(1)

    // Degree (left) and dates (right) on same line
    if (!lineLimiter.canFit(1)) break
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: edu.degree,
            size: 22
          }),
          new TextRun({
            text: '\t',
            size: 22
          }),
          new TextRun({
            text: edu.dates,
            size: 22
          })
        ],
        tabStops: [
          {
            type: TabStopType.RIGHT,
            position: rightTabPosition
          }
        ],
        spacing: { after: edu.details ? 60 : 120 }
      })
    )
    lineLimiter.consume(1)

    // Details if present
    if (edu.details) {
      if (!lineLimiter.canFit(estimateLines(edu.details, 80))) break
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: edu.details,
              size: 22,
              italics: true
            })
          ],
          spacing: { after: 160 }
        })
      )
      lineLimiter.consume(estimateLines(edu.details, 80))
    }
  }

  return elements
}

function generateExperienceSection(experience, rightTabPosition, lineLimiter) {
  if (!experience || experience.length === 0) return []

  const elements = []

  for (const exp of experience) {
    if (!lineLimiter.canFit(2)) break
    // Company name (left) and location (right) on same line
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: exp.company.toUpperCase(),
            bold: true,
            size: 22
          }),
          new TextRun({
            text: '\t',
            size: 22
          }),
          new TextRun({
            text: exp.location,
            size: 22
          })
        ],
        tabStops: [
          {
            type: TabStopType.RIGHT,
            position: rightTabPosition
          }
        ],
        spacing: { before: 120, after: 60 }
      })
    )
    lineLimiter.consume(1)

    // Title (left) and dates (right) on same line
    if (!lineLimiter.canFit(1)) break
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: exp.title,
            size: 22,
            italics: true
          }),
          new TextRun({
            text: '\t',
            size: 22
          }),
          new TextRun({
            text: exp.dates,
            size: 22
          })
        ],
        tabStops: [
          {
            type: TabStopType.RIGHT,
            position: rightTabPosition
          }
        ],
        spacing: { after: 120 }
      })
    )
    lineLimiter.consume(1)

    // Bullets
    if (exp.bullets && exp.bullets.length > 0) {
      for (const bullet of exp.bullets) {
        const bulletLines = estimateLines(bullet, 70)
        if (!lineLimiter.canFit(bulletLines)) break
        elements.push(
          new Paragraph({
            numbering: {
              reference: 'resume-bullets',
              level: 0
            },
            children: [
              new TextRun({
                text: bullet,
                size: 20
              })
            ],
            spacing: { after: 80 }
          })
        )
        lineLimiter.consume(bulletLines)
      }
    }
  }

  return elements
}

function generateSkillsSection(skills, lineLimiter) {
  if (!lineLimiter.canFit(2)) return []

  const linesForSkills = estimateLines(skills, 80)
  if (!lineLimiter.canFit(1 + linesForSkills)) return []

  lineLimiter.consume(1)
  lineLimiter.consume(linesForSkills)

  return [
    new Paragraph({
      children: [
        new TextRun({
          text: 'ADDITIONAL INFORMATION',
          bold: true,
          size: 22
        })
      ],
      spacing: { before: 240, after: 120 },
      border: {
        bottom: {
          color: '000000',
          space: 1,
          style: BorderStyle.SINGLE,
          size: 6
        }
      }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Technical & Software: ',
          size: 22,
          bold: true
        }),
        new TextRun({
          text: skills,
          size: 22
        })
      ],
      spacing: { after: 120 }
    })
  ]
}

function createLineLimiter(maxLines) {
  let usedLines = 0

  return {
    canFit(lines) {
      return usedLines + lines <= maxLines
    },
    consume(lines) {
      usedLines += lines
    }
  }
}

function estimateLines(text, maxCharsPerLine) {
  if (!text) return 1
  const normalized = String(text).replace(/\s+/g, ' ').trim()
  return Math.max(1, Math.ceil(normalized.length / maxCharsPerLine))
}
