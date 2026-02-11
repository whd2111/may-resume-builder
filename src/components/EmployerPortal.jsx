import { useState, useEffect } from 'react'
import { ArrowLeftIcon, DownloadIcon, CheckIcon } from '../utils/icons'
import { supabase } from '../lib/supabase'
import mammoth from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist'

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

function EmployerPortal({ onBack, user }) {
  const [jobTitle, setJobTitle] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [location, setLocation] = useState('')
  const [jobDescriptionFile, setJobDescriptionFile] = useState(null)
  const [jobDescriptionText, setJobDescriptionText] = useState('')
  const [additionalRequirements, setAdditionalRequirements] = useState('')
  const [contactEmail, setContactEmail] = useState(user?.email || '')
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [savedJobs, setSavedJobs] = useState([])

  useEffect(() => {
    loadEmployerJobs()
  }, [user])

  const loadEmployerJobs = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('employer_jobs')
        .select('*')
        .eq('employer_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSavedJobs(data || [])
    } catch (err) {
      console.error('Error loading jobs:', err)
    }
  }

  // Parse DOCX file
  const parseDocx = async (file) => {
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value
  }

  // Parse PDF file
  const parsePdf = async (file) => {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let fullText = ''
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map(item => item.str).join(' ')
      fullText += pageText + '\n'
    }
    
    return fullText
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setJobDescriptionFile(file)
    setIsProcessing(true)
    setError('')

    try {
      let text
      if (file.name.endsWith('.pdf')) {
        text = await parsePdf(file)
      } else if (file.name.endsWith('.docx')) {
        text = await parseDocx(file)
      } else {
        throw new Error('Please upload a .docx or .pdf file')
      }

      setJobDescriptionText(text)
    } catch (err) {
      console.error('Error parsing file:', err)
      setError(err.message || 'Failed to parse file')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!jobTitle || !companyName || (!jobDescriptionFile && !jobDescriptionText)) {
      setError('Please fill in job title, company name, and upload a job description')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const jobData = {
        employer_id: user.id,
        job_title: jobTitle.trim(),
        company_name: companyName.trim(),
        location: location.trim() || null,
        job_description: jobDescriptionText,
        additional_requirements: additionalRequirements.trim() || null,
        contact_email: contactEmail.trim(),
        status: 'active'
      }

      const { error: insertError } = await supabase
        .from('employer_jobs')
        .insert([jobData])

      if (insertError) throw insertError

      setSuccess(true)
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setJobTitle('')
        setCompanyName('')
        setLocation('')
        setJobDescriptionFile(null)
        setJobDescriptionText('')
        setAdditionalRequirements('')
        setSuccess(false)
        loadEmployerJobs()
      }, 2000)
    } catch (err) {
      console.error('Error saving job:', err)
      setError('Failed to save job posting. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (success) {
    return (
      <div className="container">
        <div style={{ 
          textAlign: 'center', 
          padding: 'var(--space-3xl)',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          <div style={{ 
            fontSize: '64px', 
            marginBottom: 'var(--space-lg)'
          }}>
            <CheckIcon />
          </div>
          <h2 style={{ marginBottom: 'var(--space-md)' }}>
            Job Posted Successfully!
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Your job posting has been saved and is now active.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <nav className="nav-bar">
        <button className="back-button" onClick={onBack}>
          <ArrowLeftIcon />
          Back
        </button>
        <div className="logo" style={{ fontSize: '24px', margin: 0 }}>May</div>
      </nav>

      <div className="page-header">
        <h1 className="page-title">Employer Portal</h1>
        <p className="page-subtitle">
          Post a job opening and specify what you're looking for
        </p>
      </div>

      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
            
            {/* Basic Job Info */}
            <div className="card-premium">
              <h3 style={{ marginBottom: 'var(--space-md)' }}>Job Details</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: 'var(--space-xs)',
                    fontWeight: 500
                  }}>
                    Job Title *
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g., Senior Product Manager"
                    required
                    style={{
                      width: '100%',
                      padding: 'var(--space-md)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: 'var(--space-xs)',
                    fontWeight: 500
                  }}>
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g., Acme Corp"
                    required
                    style={{
                      width: '100%',
                      padding: 'var(--space-md)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: 'var(--space-xs)',
                    fontWeight: 500
                  }}>
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., New York, NY (Remote OK)"
                    style={{
                      width: '100%',
                      padding: 'var(--space-md)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: 'var(--space-xs)',
                    fontWeight: 500
                  }}>
                    Contact Email *
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="hiring@company.com"
                    required
                    style={{
                      width: '100%',
                      padding: 'var(--space-md)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Job Description Upload */}
            <div className="card-premium">
              <h3 style={{ marginBottom: 'var(--space-md)' }}>Job Description *</h3>
              
              {!jobDescriptionFile ? (
                <div 
                  onClick={() => document.getElementById('jd-file-input').click()}
                  style={{
                    border: '2px dashed var(--border-color)',
                    borderRadius: '12px',
                    padding: 'var(--space-2xl)',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'var(--bg-subtle)'
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: 'var(--space-md)' }}>
                    <DownloadIcon />
                  </div>
                  <p style={{ fontWeight: 500, marginBottom: 'var(--space-xs)' }}>
                    Upload Job Description
                  </p>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    Click to upload .docx or .pdf file
                  </p>
                  <input
                    id="jd-file-input"
                    type="file"
                    accept=".docx,.pdf"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                </div>
              ) : (
                <div>
                  <div style={{
                    background: 'var(--bg-subtle)',
                    padding: 'var(--space-md)',
                    borderRadius: '8px',
                    marginBottom: 'var(--space-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ fontWeight: 500 }}>
                      {jobDescriptionFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setJobDescriptionFile(null)
                        setJobDescriptionText('')
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-tertiary)',
                        cursor: 'pointer',
                        fontSize: '18px',
                        padding: '4px 8px'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  
                  {isProcessing && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                      Processing file...
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Additional Requirements */}
            <div className="card-premium">
              <h3 style={{ marginBottom: 'var(--space-md)' }}>Additional Requirements</h3>
              <p style={{ 
                fontSize: '14px', 
                color: 'var(--text-secondary)', 
                marginBottom: 'var(--space-md)' 
              }}>
                Specify any other qualities, skills, or preferences you're looking for beyond the job description.
              </p>
              
              <textarea
                value={additionalRequirements}
                onChange={(e) => setAdditionalRequirements(e.target.value)}
                placeholder="e.g., Must have experience with Python and machine learning. Prefer candidates with startup experience. Looking for someone who can start within 2 weeks."
                rows={6}
                style={{
                  width: '100%',
                  padding: 'var(--space-md)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            {error && (
              <div style={{
                background: '#fee',
                border: '1px solid #fcc',
                borderRadius: '8px',
                padding: 'var(--space-md)',
                color: '#c00'
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving || isProcessing}
              style={{ width: '100%', fontSize: '16px', padding: '16px' }}
            >
              {isSaving ? 'Saving...' : 'Post Job'}
            </button>
          </div>
        </form>

        {/* Previously Posted Jobs */}
        {savedJobs.length > 0 && (
          <div style={{ marginTop: 'var(--space-3xl)' }}>
            <h3 style={{ marginBottom: 'var(--space-lg)' }}>Your Posted Jobs</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {savedJobs.map(job => (
                <div key={job.id} className="card-premium" style={{ borderLeft: '4px solid var(--primary-color)' }}>
                  <h4 style={{ marginBottom: 'var(--space-xs)' }}>{job.job_title}</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    {job.company_name} {job.location && `• ${job.location}`}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: 'var(--space-sm)' }}>
                    Posted {new Date(job.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EmployerPortal
