import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  LevelFormat,
  BorderStyle
} from 'docx'
import { saveAs } from 'file-saver'

export async function generateDOCX(resumeData, filename = 'resume.docx') {
  // Create the document with US Letter page size
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Arial',
            size: 22 // 11pt
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
              right: 720,
              bottom: 720,
              left: 720
            }
          }
        },
        children: [
          // Header: Name
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: resumeData.name.toUpperCase(),
                bold: true,
                size: 24 // 12pt
              })
            ],
            spacing: { after: 100 }
          }),

          // Contact info
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: `${resumeData.contact.phone}, ${resumeData.contact.email}`,
                size: 20 // 10pt
              })
            ],
            spacing: { after: 200 },
            border: {
              bottom: {
                color: '000000',
                space: 1,
                style: BorderStyle.SINGLE,
                size: 6
              }
            }
          }),

          // Education Section
          ...generateEducationSection(resumeData.education),

          // Experience Section
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

  education.forEach((edu, index) => {
    // Institution name and location
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: edu.institution.toUpperCase(),
            bold: true,
            size: 22
          })
        ],
        spacing: { before: index === 0 ? 240 : 200, after: 80 }
      })
    )

    // Location (right-aligned on same conceptual line)
    elements.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({
            text: edu.location,
            size: 22
          })
        ],
        spacing: { before: 0, after: 80 }
      })
    )

    // Degree and dates
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: edu.degree,
            size: 22
          })
        ],
        spacing: { after: 80 }
      })
    )

    elements.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({
            text: edu.dates,
            size: 22
          })
        ],
        spacing: { after: edu.details ? 80 : 200 }
      })
    )

    // Details if present
    if (edu.details) {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: edu.details,
              size: 22
            })
          ],
          spacing: { after: 200 }
        })
      )
    }
  })

  return elements
}

function generateExperienceSection(experience) {
  if (!experience || experience.length === 0) return []

  const elements = []

  experience.forEach((exp, index) => {
    // Company name and location
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: exp.company.toUpperCase(),
            bold: true,
            size: 22
          })
        ],
        spacing: { before: index === 0 ? 240 : 200, after: 80 }
      })
    )

    elements.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({
            text: exp.location,
            size: 22
          })
        ],
        spacing: { before: 0, after: 80 }
      })
    )

    // Title and dates
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: exp.title,
            size: 22
          })
        ],
        spacing: { after: 80 }
      })
    )

    elements.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({
            text: exp.dates,
            size: 22
          })
        ],
        spacing: { after: 160 }
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
                size: 22
              })
            ],
            spacing: { after: 120 }
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
          italics: true
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
