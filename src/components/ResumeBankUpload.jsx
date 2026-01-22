import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { callClaude } from '../utils/claudeApi'
import mammoth from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist'
import { ArrowLeftIcon, UploadIcon, CheckIcon, XIcon } from '../utils/icons'

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

// System prompt for analyzing resumes
const ANALYZE_RESUME_PROMPT = `You are an expert resume analyzer. Analyze the provided resume and extract:

1. Structured resume data
2. Quality assessment
3. Notable features and best practices

Respond with JSON in this EXACT format:
{
  "resume_data": {
    "name": "Full Name",
    "contact": {
      "phone": "xxx-xxx-xxxx",
      "email": "email@example.com",
      "linkedin": "linkedin.com/in/username"
    },
    "education": [...],
    "experience": [...],
    "skills": "...",
    "additional": "..."
  },
  "analysis": {
    "industry": "tech|finance|consulting|healthcare|marketing|other",
    "role_level": "entry|mid|senior|executive",
    "job_function": "engineering|product|marketing|sales|operations|other",
    "quality_score": 1-5,
    "has_metrics": true/false,
    "has_strong_action_verbs": true/false,
    "formatting_quality": "excellent|good|fair|poor",
    "notable_features": ["array", "of", "features"],
    "keywords": ["key", "skills", "technologies"],
    "admin_notes": "What makes this resume good or bad, what to learn from it"
  }
}`

function ResumeBankUpload({ onBack }) {
  const [files, setFiles] = useState([])
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState([])
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || [])
    const resumeFiles = selectedFiles.filter(f => 
      f.name.endsWith('.docx') || f.name.endsWith('.pdf')
    )
    setFiles(resumeFiles)
    setResults([])
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const droppedFiles = Array.from(e.dataTransfer.files || [])
    const resumeFiles = droppedFiles.filter(f => 
      f.name.endsWith('.docx') || f.name.endsWith('.pdf')
    )
    setFiles(resumeFiles)
    setResults([])
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const parseDocx = async (file) => {
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value
  }

  const parsePdf = async (file) => {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let text = ''
    
    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items.map(item => item.str).join(' ')
      text += pageText + '\n'
    }
    
    return text
  }

  const processResume = async (file) => {
    try {
      // Parse the file based on type
      let resumeText
      if (file.name.endsWith('.pdf')) {
        resumeText = await parsePdf(file)
      } else {
        resumeText = await parseDocx(file)
      }

      // Send to Claude for analysis
      const prompt = `Analyze this resume:\n\n${resumeText}`
      const response = await callClaude(null, [{ role: 'user', content: prompt }], ANALYZE_RESUME_PROMPT)

      // Parse response
      const jsonMatch = response.match(/\{[\s\S]*"resume_data"[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Could not parse AI response')
      }

      const parsed = JSON.parse(jsonMatch[0])

      // Store in Supabase (no user ID required - password protected in UI)
      const { data, error } = await supabase
        .from('resume_bank')
        .insert({
          uploaded_by: null,
          resume_data: parsed.resume_data,
          original_text: resumeText,
          source_filename: file.name,
          industry: parsed.analysis.industry,
          role_level: parsed.analysis.role_level,
          job_function: parsed.analysis.job_function,
          quality_score: parsed.analysis.quality_score,
          has_metrics: parsed.analysis.has_metrics,
          has_strong_action_verbs: parsed.analysis.has_strong_action_verbs,
          formatting_quality: parsed.analysis.formatting_quality,
          notable_features: parsed.analysis.notable_features,
          keywords: parsed.analysis.keywords,
          admin_notes: parsed.analysis.admin_notes,
          is_approved: true,
          is_featured: parsed.analysis.quality_score >= 4
        })
        .select()
        .single()

      if (error) throw error

      return {
        filename: file.name,
        status: 'success',
        data: parsed,
        id: data.id
      }
    } catch (error) {
      return {
        filename: file.name,
        status: 'error',
        error: error.message
      }
    }
  }

  const handleBatchUpload = async () => {
    if (files.length === 0) return

    setProcessing(true)
    setResults([])
    setUploadProgress(0)

    const uploadResults = []

    for (let i = 0; i < files.length; i++) {
      const result = await processResume(files[i])
      uploadResults.push(result)
      setResults([...uploadResults])
      setUploadProgress(((i + 1) / files.length) * 100)
    }

    setProcessing(false)
  }

  const handleReset = () => {
    setFiles([])
    setResults([])
    setUploadProgress(0)
  }

  const successCount = results.filter(r => r.status === 'success').length
  const errorCount = results.filter(r => r.status === 'error').length

  return (
    <div className="container">
      <nav className="nav-bar">
        {onBack && (
          <button className="back-button" onClick={onBack}>
            <ArrowLeftIcon />
            Back
          </button>
        )}
        <div className="logo" style={{ fontSize: '24px', margin: 0 }}>May</div>
      </nav>

      <div className="page-header">
        <h1 className="page-title">Resume Bank Upload</h1>
        <p className="page-subtitle">
          Upload multiple resumes for May to learn from and adopt best practices
        </p>
      </div>

      {/* Upload area */}
      {files.length === 0 ? (
        <div
          className="upload-area stagger-1"
          onClick={() => document.getElementById('batch-file-input').click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          style={{ minHeight: '300px' }}
        >
          <div className="action-card-icon" style={{ margin: '0 auto var(--space-xl)', background: 'var(--gradient-warm)' }}>
            <UploadIcon />
          </div>
              <h3 className="action-card-title" style={{ textAlign: 'center' }}>
            Upload Resume Examples
          </h3>
          <p className="action-card-description" style={{ textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
            Click to browse or drag and drop multiple .pdf or .docx files here.
            <br />
            Each resume will be analyzed and added to May's learning bank.
          </p>
          <input
            id="batch-file-input"
            type="file"
            accept=".docx,.pdf"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>
      ) : (
        <>
          {/* File list */}
          <div className="card-premium stagger-1">
            <div className="card-title">
              <UploadIcon />
              Selected Files ({files.length})
            </div>
            
            <div style={{ maxHeight: '300px', overflow: 'auto', marginBottom: 'var(--space-lg)' }}>
              {files.map((file, idx) => {
                const result = results.find(r => r.filename === file.name)
                return (
                  <div
                    key={idx}
                    style={{
                      padding: 'var(--space-md)',
                      marginBottom: 'var(--space-sm)',
                      background: result
                        ? result.status === 'success'
                          ? '#f0fdf4'
                          : '#fef2f2'
                        : 'var(--surface-secondary)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '14px'
                    }}
                  >
                    <span style={{ color: 'var(--text-primary)' }}>{file.name}</span>
                    {result && (
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: result.status === 'success' ? '#059669' : '#dc2626'
                      }}>
                        {result.status === 'success' ? (
                          <>
                            <CheckIcon />
                            Uploaded
                          </>
                        ) : (
                          <>
                            <XIcon />
                            {result.error}
                          </>
                        )}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Progress bar */}
            {processing && (
              <div style={{ marginBottom: 'var(--space-lg)' }}>
                <div style={{
                  width: '100%',
                  height: '8px',
                  background: 'var(--surface-secondary)',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${uploadProgress}%`,
                    height: '100%',
                    background: 'var(--gradient-primary)',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                <p style={{
                  textAlign: 'center',
                  marginTop: 'var(--space-sm)',
                  color: 'var(--text-secondary)',
                  fontSize: '14px'
                }}>
                  Processing {results.length + 1} of {files.length}...
                </p>
              </div>
            )}

            {/* Summary */}
            {results.length > 0 && !processing && (
              <div style={{
                padding: 'var(--space-md)',
                background: 'var(--surface-secondary)',
                borderRadius: '8px',
                marginBottom: 'var(--space-lg)'
              }}>
                <strong>Upload Complete:</strong>
                <ul style={{ margin: '8px 0 0 20px', fontSize: '14px', lineHeight: '1.8' }}>
                  <li style={{ color: '#059669' }}>✓ {successCount} successful</li>
                  {errorCount > 0 && <li style={{ color: '#dc2626' }}>✗ {errorCount} failed</li>}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="button-group">
              <button className="btn btn-secondary" onClick={handleReset}>
                Clear All
              </button>
              <button
                className="btn btn-primary"
                onClick={handleBatchUpload}
                disabled={processing || results.length === files.length}
              >
                {processing ? (
                  <>
                    <div className="loading" />
                    Processing...
                  </>
                ) : results.length === files.length ? (
                  'Upload Complete'
                ) : (
                  <>
                    <UploadIcon />
                    Upload {files.length} Resume{files.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Detailed results */}
          {results.length > 0 && results.some(r => r.status === 'success') && (
            <div className="card-premium stagger-2">
              <div className="card-title">Analysis Results</div>
              
              {results.filter(r => r.status === 'success').map((result, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 'var(--space-lg)',
                    marginBottom: 'var(--space-md)',
                    background: 'var(--surface-secondary)',
                    borderRadius: '12px',
                    borderLeft: `4px solid ${result.data.analysis.quality_score >= 4 ? '#10b981' : '#6366f1'}`
                  }}
                >
                  <h4 style={{ marginBottom: 'var(--space-sm)', fontSize: '16px' }}>
                    {result.filename}
                  </h4>
                  <div style={{ fontSize: '14px', lineHeight: '1.8', color: 'var(--text-secondary)' }}>
                    <strong>Quality Score:</strong> {result.data.analysis.quality_score}/5
                    {result.data.analysis.quality_score >= 4 && ' ⭐ (Featured!)'}
                    <br />
                    <strong>Industry:</strong> {result.data.analysis.industry}
                    <br />
                    <strong>Level:</strong> {result.data.analysis.role_level}
                    <br />
                    <strong>Function:</strong> {result.data.analysis.job_function}
                    <br />
                    <strong>Notable:</strong> {result.data.analysis.notable_features.join(', ')}
                    <br />
                    {result.data.analysis.admin_notes && (
                      <>
                        <strong>Notes:</strong> {result.data.analysis.admin_notes}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Info box */}
      <div className="card-premium stagger-2">
            <div className="card-title">How it works</div>
            <div className="info-box-text" style={{ fontSize: '15px', lineHeight: '1.8' }}>
              1. <strong>Upload:</strong> Drag and drop multiple resume .pdf or .docx files
              <br />
              2. <strong>Analysis:</strong> May analyzes each resume for quality, structure, and best practices
              <br />
              3. <strong>Categorization:</strong> Automatically categorized by industry, level, and function
              <br />
              4. <strong>Learning:</strong> High-quality resumes (4-5 stars) become featured examples
              <br />
              5. <strong>Application:</strong> May uses these patterns to improve future resume writing
            </div>
      </div>
    </div>
  )
}

export default ResumeBankUpload
