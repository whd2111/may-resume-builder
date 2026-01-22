import { useState } from 'react'
import { useResumes } from '../hooks/useResumes'
import { ArrowLeftIcon, DownloadIcon, SparklesIcon, TargetIcon } from '../utils/icons'
import { generateDOCX } from '../utils/docxGenerator'

export default function ResumeLibrary({ onBack, onSelectResume }) {
  const { resumes, masterResume, loading, deleteResume, setAsMaster, duplicateResume } = useResumes()
  const [deletingId, setDeletingId] = useState(null)

  const handleDelete = async (resumeId) => {
    if (!confirm('Are you sure you want to delete this resume?')) return
    
    try {
      setDeletingId(resumeId)
      await deleteResume(resumeId)
    } catch (error) {
      console.error('Error deleting resume:', error)
      alert('Failed to delete resume')
    } finally {
      setDeletingId(null)
    }
  }

  const handleSetAsMaster = async (resumeId) => {
    try {
      await setAsMaster(resumeId)
    } catch (error) {
      console.error('Error setting master resume:', error)
      alert('Failed to set as master resume')
    }
  }

  const handleDuplicate = async (resumeId, title) => {
    try {
      await duplicateResume(resumeId, `${title} (Copy)`)
    } catch (error) {
      console.error('Error duplicating resume:', error)
      alert('Failed to duplicate resume')
    }
  }

  const handleDownload = (resume) => {
    try {
      generateDOCX(resume.resume_data)
    } catch (error) {
      console.error('Error generating DOCX:', error)
      alert('Failed to generate resume document')
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="loading" />
          <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading your resumes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <nav className="nav-bar">
        <button className="back-button" onClick={onBack}>
          <ArrowLeftIcon />
          Back to Home
        </button>
        <div className="logo" style={{ fontSize: '24px', margin: 0 }}>May</div>
      </nav>

      <div className="page-header">
        <h1 className="page-title">My Resumes</h1>
        <p className="page-subtitle">
          View and manage all your saved resumes
        </p>
      </div>

      {resumes.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: 'var(--space-3xl) var(--space-lg)',
          background: 'rgba(255, 255, 255, 0.4)',
          borderRadius: 'var(--radius-lg)',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <span className="action-card-icon" style={{ margin: '0 auto var(--space-lg)' }}>
            <SparklesIcon />
          </span>
          <h2 style={{ fontSize: '24px', marginBottom: 'var(--space-sm)' }}>No resumes yet</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
            Start by building your first resume!
          </p>
          <button className="btn btn-primary" onClick={onBack}>
            Build Your First Resume
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', maxWidth: '900px', margin: '0 auto' }}>
          {resumes.map((resume) => (
            <div 
              key={resume.id}
              style={{
                background: resume.is_master ? 'rgba(124, 58, 237, 0.05)' : 'rgba(255, 255, 255, 0.6)',
                border: resume.is_master ? '2px solid rgba(124, 58, 237, 0.2)' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-xl)',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
                      {resume.title}
                    </h3>
                    {resume.is_master && (
                      <span style={{
                        background: 'var(--accent-primary)',
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Master
                      </span>
                    )}
                  </div>
                  
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)' }}>
                    {resume.resume_data?.name || 'Unnamed Resume'}
                  </p>
                  
                  {resume.tailored_for && (
                    <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <TargetIcon />
                      Tailored for: {resume.tailored_for.substring(0, 60)}...
                    </p>
                  )}
                  
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: 'var(--space-sm)' }}>
                    Created {new Date(resume.created_at).toLocaleDateString()}
                    {resume.updated_at !== resume.created_at && ` • Updated ${new Date(resume.updated_at).toLocaleDateString()}`}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                <button 
                  className="btn btn-primary"
                  onClick={() => handleDownload(resume)}
                  style={{ fontSize: '14px', padding: '8px 16px' }}
                >
                  <DownloadIcon />
                  Download
                </button>

                {!resume.is_master && (
                  <button 
                    className="btn btn-secondary"
                    onClick={() => handleSetAsMaster(resume.id)}
                    style={{ fontSize: '14px', padding: '8px 16px' }}
                  >
                    Set as Master
                  </button>
                )}

                <button 
                  className="btn btn-secondary"
                  onClick={() => handleDuplicate(resume.id, resume.title)}
                  style={{ fontSize: '14px', padding: '8px 16px' }}
                >
                  Duplicate
                </button>

                <button 
                  className="btn btn-ghost"
                  onClick={() => handleDelete(resume.id)}
                  disabled={deletingId === resume.id}
                  style={{ 
                    fontSize: '14px', 
                    padding: '8px 16px',
                    color: 'var(--text-tertiary)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  {deletingId === resume.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
