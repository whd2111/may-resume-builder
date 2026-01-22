import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  LevelFormat,
  BorderStyle,
  TabStopType,
  TabStopPosition
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
        children: [
          // Header: Name
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: resumeData.name.toUpperCase(),
                bold: true,
                size: 24 // 12pt for name
              })
            ],
            spacing: { after: 60 }
          }),

          // Contact info
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `${resumeData.contact.phone} | ${resumeData.contact.email}`,
                size: 20 // 10pt
              })
            ],
            spacing: { after: 180 }
          }),

          // Education Section Header
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

          // Education entries
          ...generateEducationSection(resumeData.education),

          // Experience Section Header
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

          // Experience entries
          ...generateExperienceSection(resumeData.experience),

          // Skills/Additional Info Section
          ...(resumeData.skills ? generateSkillsSection(resumeData.skills) : [])
        ]
      }
    ]
  })

  // Generate and save
  const blob = await Packer.toBlob(doc)
  saveAs(blob, filename)
}

function generateEducationSection(education) {
  if (!education || education.length === 0) return []

  const elements = []

  education.forEach((edu) => {
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
            position: TabStopPosition.MAX
          }
        ],
        spacing: { before: 120, after: 60 }
      })
    )

    // Degree (left) and dates (right) on same line
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
            position: TabStopPosition.MAX
          }
        ],
        spacing: { after: edu.details ? 60 : 120 }
      })
    )

    // Details if present
    if (edu.details) {
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
    }
  })

  return elements
}

function generateExperienceSection(experience) {
  if (!experience || experience.length === 0) return []

  const elements = []

  experience.forEach((exp) => {
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
            position: TabStopPosition.MAX
          }
        ],
        spacing: { before: 120, after: 60 }
      })
    )

    // Title (left) and dates (right) on same line
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
            position: TabStopPosition.MAX
          }
        ],
        spacing: { after: 120 }
      })
    )

    // Bullets
    if (exp.bullets && exp.bullets.length > 0) {
      exp.bullets.forEach((bullet) => {
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
      })
    }
  })

  return elements
}

function generateSkillsSection(skills) {
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
