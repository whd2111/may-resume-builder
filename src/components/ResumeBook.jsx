import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ArrowLeftIcon, CheckIcon } from '../utils/icons'

function ResumeBook({ onBack, user }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [existingProfile, setExistingProfile] = useState(null)
  const [primaryResume, setPrimaryResume] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    location: '',
    linkedin_url: '',
    github_url: '',
    portfolio_url: '',
    other_url: '',
    graduation_year: '',
    degree_program: '',
    concentration: ''
  })

  useEffect(() => {
    loadData()
  }, [user])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load existing profile if any
      const { data: profile } = await supabase
        .from('resume_book_profiles')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (profile) {
        setExistingProfile(profile)
        setFormData({
          full_name: profile.full_name || '',
          email: profile.email || '',
          phone: profile.phone || '',
          location: profile.location || '',
          linkedin_url: profile.linkedin_url || '',
          github_url: profile.github_url || '',
          portfolio_url: profile.portfolio_url || '',
          other_url: profile.other_url || '',
          graduation_year: profile.graduation_year || '',
          degree_program: profile.degree_program || '',
          concentration: profile.concentration || ''
        })
      } else {
        // Load primary resume to prefill
        const { data: resume } = await supabase
          .from('resumes')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_master', true)
          .single()

        if (resume) {
          setPrimaryResume(resume)
          const resumeData = resume.resume_data
          
          // Prefill from resume
          setFormData({
            full_name: resumeData.name || '',
            email: resumeData.contact?.email || user.email || '',
            phone: resumeData.contact?.phone || '',
            location: resumeData.contact?.location || '',
            linkedin_url: resumeData.contact?.linkedin || '',
            github_url: resumeData.contact?.github || '',
            portfolio_url: resumeData.contact?.portfolio || resumeData.contact?.website || '',
            other_url: '',
            graduation_year: '',
            degree_program: '',
            concentration: ''
          })
        } else {
          // Just use user email
          setFormData(prev => ({ ...prev, email: user.email }))
        }
      }
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Error loading your data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation
    if (!formData.full_name || !formData.email) {
      setError('Name and email are required')
      return
    }

    if (!primaryResume && !existingProfile) {
      setError('Please create a primary resume first before joining the Resume Book')
      return
    }

    try {
      setSaving(true)
      setError('')

      const profileData = {
        user_id: user.id,
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        location: formData.location.trim() || null,
        linkedin_url: formData.linkedin_url.trim() || null,
        github_url: formData.github_url.trim() || null,
        portfolio_url: formData.portfolio_url.trim() || null,
        other_url: formData.other_url.trim() || null,
        graduation_year: formData.graduation_year ? parseInt(formData.graduation_year) : null,
        degree_program: formData.degree_program.trim() || null,
        concentration: formData.concentration.trim() || null,
        resume_id: primaryResume?.id || existingProfile?.resume_id,
        resume_snapshot: primaryResume?.resume_data || existingProfile?.resume_snapshot,
        is_active: true,
        is_public: true
      }

      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('resume_book_profiles')
          .update(profileData)
          .eq('id', existingProfile.id)

        if (updateError) throw updateError
      } else {
        // Create new profile
        const { error: insertError } = await supabase
          .from('resume_book_profiles')
          .insert([profileData])

        if (insertError) throw insertError
      }

      setSuccess(true)
      setTimeout(() => {
        onBack()
      }, 2000)
    } catch (err) {
      console.error('Error saving profile:', err)
      setError('Error saving your profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
          <p>Loading your profile...</p>
        </div>
      </div>
    )
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
            ✓
          </div>
          <h2 style={{ marginBottom: 'var(--space-md)' }}>
            Profile Saved!
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Your profile has been added to the CBS Resume Book.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <button className="btn-back" onClick={onBack}>
        <ArrowLeftIcon />
        Back
      </button>

      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1>Join the CBS Resume Book</h1>
        <p style={{ 
          color: 'var(--text-secondary)', 
          marginBottom: 'var(--space-2xl)' 
        }}>
          Share your profile with the Columbia Business School community. Your primary resume and contact information will be included in the resume book.
        </p>

        {!primaryResume && !existingProfile && (
          <div style={{
            background: '#fef3c7',
            border: '1px solid #fbbf24',
            borderRadius: '12px',
            padding: 'var(--space-lg)',
            marginBottom: 'var(--space-xl)'
          }}>
            <p style={{ margin: 0 }}>
              ⚠️ Please create a primary resume first before joining the Resume Book.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 'var(--space-lg)' 
          }}>
            {/* Basic Info */}
            <div>
              <h3 style={{ marginBottom: 'var(--space-md)' }}>Basic Information</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: 'var(--space-xs)',
                    fontWeight: 500
                  }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => handleChange('full_name', e.target.value)}
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
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
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
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
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
                    value={formData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    placeholder="e.g., New York, NY"
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

            {/* Links */}
            <div>
              <h3 style={{ marginBottom: 'var(--space-md)' }}>Links</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: 'var(--space-xs)',
                    fontWeight: 500
                  }}>
                    LinkedIn URL
                  </label>
                  <input
                    type="url"
                    value={formData.linkedin_url}
                    onChange={(e) => handleChange('linkedin_url', e.target.value)}
                    placeholder="https://linkedin.com/in/yourname"
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
                    GitHub URL
                  </label>
                  <input
                    type="url"
                    value={formData.github_url}
                    onChange={(e) => handleChange('github_url', e.target.value)}
                    placeholder="https://github.com/yourusername"
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
                    Portfolio/Website URL
                  </label>
                  <input
                    type="url"
                    value={formData.portfolio_url}
                    onChange={(e) => handleChange('portfolio_url', e.target.value)}
                    placeholder="https://yourwebsite.com"
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
                    Other URL
                  </label>
                  <input
                    type="url"
                    value={formData.other_url}
                    onChange={(e) => handleChange('other_url', e.target.value)}
                    placeholder="https://..."
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

            {/* Graduation Info */}
            <div>
              <h3 style={{ marginBottom: 'var(--space-md)' }}>Program Information</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: 'var(--space-xs)',
                    fontWeight: 500
                  }}>
                    Graduation Year
                  </label>
                  <input
                    type="number"
                    value={formData.graduation_year}
                    onChange={(e) => handleChange('graduation_year', e.target.value)}
                    placeholder="2025"
                    min="2020"
                    max="2030"
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
                    Degree Program
                  </label>
                  <select
                    value={formData.degree_program}
                    onChange={(e) => handleChange('degree_program', e.target.value)}
                    style={{
                      width: '100%',
                      padding: 'var(--space-md)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  >
                    <option value="">Select program</option>
                    <option value="MBA">MBA</option>
                    <option value="EMBA">EMBA</option>
                    <option value="MS">MS</option>
                    <option value="PhD">PhD</option>
                  </select>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: 'var(--space-xs)',
                    fontWeight: 500
                  }}>
                    Concentration
                  </label>
                  <input
                    type="text"
                    value={formData.concentration}
                    onChange={(e) => handleChange('concentration', e.target.value)}
                    placeholder="e.g., Finance, Marketing, Entrepreneurship"
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
              disabled={saving || (!primaryResume && !existingProfile)}
              style={{ width: '100%' }}
            >
              {saving ? 'Saving...' : existingProfile ? 'Update Profile' : 'Join Resume Book'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ResumeBook
