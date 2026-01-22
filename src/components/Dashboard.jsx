import { useState } from 'react'
import { useResumes } from '../hooks/useResumes'
import { useStories } from '../hooks/useStories'
import { ArrowLeftIcon, DownloadIcon, WritingIcon, TargetIcon } from '../utils/icons'
import { generateDOCX } from '../utils/docxGenerator'

export default function Dashboard({ onBack }) {
  const { resumes, loading: resumesLoading, deleteResume, setAsMaster } = useResumes()
  const { stories, loading: storiesLoading, createStory, updateStory, deleteStory } = useStories()
  const [activeTab, setActiveTab] = useState('resumes') // 'resumes' or 'stories'
  const [showAddStory, setShowAddStory] = useState(false)
  const [editingStory, setEditingStory] = useState(null)
  const [storyForm, setStoryForm] = useState({
    title: '',
    company: '',
    role: '',
    story_type: 'achievement',
    situation: '',
    task: '',
    action: '',
    result: '',
    bullet_points: [''],
    skills: [],
    metrics: [],
    tags: []
  })

  const handleDownloadResume = (resume) => {
    try {
      generateDOCX(resume.resume_data)
    } catch (error) {
      console.error('Error generating DOCX:', error)
      alert('Failed to download resume')
    }
  }

  const handleDeleteResume = async (resumeId) => {
    if (!confirm('Are you sure you want to delete this resume?')) return
    try {
      await deleteResume(resumeId)
    } catch (error) {
      alert('Failed to delete resume')
    }
  }

  const handleSetAsMain = async (resumeId) => {
    try {
      await setAsMaster(resumeId)
    } catch (error) {
      alert('Failed to set as main resume')
    }
  }

  const handleSaveStory = async () => {
    try {
      const storyData = {
        ...storyForm,
        bullet_points: storyForm.bullet_points.filter(b => b.trim()),
        skills: Array.isArray(storyForm.skills) ? storyForm.skills : 
                storyForm.skills.split(',').map(s => s.trim()).filter(Boolean),
        metrics: Array.isArray(storyForm.metrics) ? storyForm.metrics :
                 storyForm.metrics.split(',').map(m => m.trim()).filter(Boolean),
        tags: Array.isArray(storyForm.tags) ? storyForm.tags :
              storyForm.tags.split(',').map(t => t.trim()).filter(Boolean)
      }

      if (editingStory) {
        await updateStory(editingStory.id, storyData)
      } else {
        await createStory(storyData)
      }

      // Reset form
      setStoryForm({
        title: '',
        company: '',
        role: '',
        story_type: 'achievement',
        situation: '',
        task: '',
        action: '',
        result: '',
        bullet_points: [''],
        skills: [],
        metrics: [],
        tags: []
      })
      setShowAddStory(false)
      setEditingStory(null)
    } catch (error) {
      alert('Failed to save story')
    }
  }

  const handleEditStory = (story) => {
    setEditingStory(story)
    setStoryForm({
      title: story.title || '',
      company: story.company || '',
      role: story.role || '',
      story_type: story.story_type || 'achievement',
      situation: story.situation || '',
      task: story.task || '',
      action: story.action || '',
      result: story.result || '',
      bullet_points: story.bullet_points || [''],
      skills: story.skills || [],
      metrics: story.metrics || [],
      tags: story.tags || []
    })
    setShowAddStory(true)
  }

  const handleDeleteStory = async (storyId) => {
    if (!confirm('Are you sure you want to delete this story?')) return
    try {
      await deleteStory(storyId)
    } catch (error) {
      alert('Failed to delete story')
    }
  }

  const addBulletPoint = () => {
    setStoryForm({
      ...storyForm,
      bullet_points: [...storyForm.bullet_points, '']
    })
  }

  const updateBulletPoint = (index, value) => {
    const newBullets = [...storyForm.bullet_points]
    newBullets[index] = value
    setStoryForm({ ...storyForm, bullet_points: newBullets })
  }

  const removeBulletPoint = (index) => {
    const newBullets = storyForm.bullet_points.filter((_, i) => i !== index)
    setStoryForm({ ...storyForm, bullet_points: newBullets })
  }

  if (resumesLoading || storiesLoading) {
    return (
      <div className="container">
        <div className="loading" style={{ margin: '60px auto' }} />
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: '1100px' }}>
      <nav className="nav-bar">
        <button className="back-button" onClick={onBack}>
          <ArrowLeftIcon />
          Back
        </button>
        <div className="logo" style={{ fontSize: '24px', margin: 0 }}>May</div>
      </nav>

      <div className="page-header">
        <h1 className="page-title">My Dashboard</h1>
        <p className="page-subtitle">Manage your resumes and story library</p>
      </div>

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: 'var(--space-md)', 
        marginBottom: 'var(--space-xl)',
        borderBottom: '2px solid var(--border-subtle)'
      }}>
        <button
          onClick={() => setActiveTab('resumes')}
          style={{
            background: 'none',
            border: 'none',
            padding: 'var(--space-md) var(--space-lg)',
            fontSize: '16px',
            fontWeight: '600',
            color: activeTab === 'resumes' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'resumes' ? '2px solid var(--accent-primary)' : 'none',
            marginBottom: '-2px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          My Resumes ({resumes.length})
        </button>
        <button
          onClick={() => setActiveTab('stories')}
          style={{
            background: 'none',
            border: 'none',
            padding: 'var(--space-md) var(--space-lg)',
            fontSize: '16px',
            fontWeight: '600',
            color: activeTab === 'stories' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'stories' ? '2px solid var(--accent-primary)' : 'none',
            marginBottom: '-2px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Story Bank ({stories.length})
        </button>
      </div>

      {/* Resumes Tab */}
      {activeTab === 'resumes' && (
        <div>
          {resumes.length === 0 ? (
            <div className="card-premium" style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
              <span className="action-card-icon" style={{ margin: '0 auto var(--space-lg)' }}>
                <WritingIcon />
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
              {resumes.map((resume) => (
                <div 
                  key={resume.id}
                  className="card-premium"
                  style={{
                    background: resume.is_master ? 'rgba(124, 58, 237, 0.05)' : 'rgba(255, 255, 255, 0.6)',
                    border: resume.is_master ? '2px solid rgba(124, 58, 237, 0.2)' : '1px solid var(--border-subtle)',
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
                            Main
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
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleDownloadResume(resume)}
                      style={{ fontSize: '14px', padding: '8px 16px' }}
                    >
                      <DownloadIcon />
                      Download
                    </button>

                    {!resume.is_master && (
                      <button 
                        className="btn btn-secondary"
                        onClick={() => handleSetAsMain(resume.id)}
                        style={{ fontSize: '14px', padding: '8px 16px' }}
                      >
                        Set as Main
                      </button>
                    )}

                    <button 
                      className="btn btn-ghost"
                      onClick={() => handleDeleteResume(resume.id)}
                      style={{ 
                        fontSize: '14px', 
                        padding: '8px 16px',
                        color: 'var(--text-tertiary)',
                        border: '1px solid var(--border-subtle)'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stories Tab */}
      {activeTab === 'stories' && (
        <div>
          <button 
            className="btn btn-primary" 
            onClick={() => {
              setShowAddStory(true)
              setEditingStory(null)
              setStoryForm({
                title: '',
                company: '',
                role: '',
                story_type: 'achievement',
                situation: '',
                task: '',
                action: '',
                result: '',
                bullet_points: [''],
                skills: [],
                metrics: [],
                tags: []
              })
            }}
            style={{ marginBottom: 'var(--space-xl)' }}
          >
            <WritingIcon />
            Add New Story
          </button>

          {showAddStory && (
            <div className="card-premium" style={{ marginBottom: 'var(--space-xl)', borderLeft: '4px solid var(--accent-primary)' }}>
              <div className="card-title">
                <WritingIcon />
                {editingStory ? 'Edit Story' : 'Add New Story'}
              </div>

              <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: '600', fontSize: '14px' }}>
                    Story Title *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g., Reddit AI Agent at EA"
                    value={storyForm.title}
                    onChange={(e) => setStoryForm({ ...storyForm, title: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: '600', fontSize: '14px' }}>
                      Company
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Electronic Arts"
                      value={storyForm.company}
                      onChange={(e) => setStoryForm({ ...storyForm, company: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: '600', fontSize: '14px' }}>
                      Role
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Product Manager"
                      value={storyForm.role}
                      onChange={(e) => setStoryForm({ ...storyForm, role: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: '600', fontSize: '14px' }}>
                    Story Type
                  </label>
                  <select
                    className="input-field"
                    value={storyForm.story_type}
                    onChange={(e) => setStoryForm({ ...storyForm, story_type: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="achievement">Achievement</option>
                    <option value="project">Project</option>
                    <option value="leadership">Leadership</option>
                    <option value="technical">Technical</option>
                  </select>
                </div>

                {/* STAR Format */}
                <div style={{ background: 'rgba(124, 58, 237, 0.05)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: 'var(--space-md)', color: 'var(--accent-primary)' }}>
                    STAR Format
                  </h4>
                  
                  <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: '600', fontSize: '14px' }}>
                        Situation
                      </label>
                      <textarea
                        placeholder="What was the context or challenge?"
                        value={storyForm.situation}
                        onChange={(e) => setStoryForm({ ...storyForm, situation: e.target.value })}
                        style={{ width: '100%', minHeight: '80px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: '600', fontSize: '14px' }}>
                        Task
                      </label>
                      <textarea
                        placeholder="What was your responsibility or goal?"
                        value={storyForm.task}
                        onChange={(e) => setStoryForm({ ...storyForm, task: e.target.value })}
                        style={{ width: '100%', minHeight: '80px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: '600', fontSize: '14px' }}>
                        Action
                      </label>
                      <textarea
                        placeholder="What specific actions did you take?"
                        value={storyForm.action}
                        onChange={(e) => setStoryForm({ ...storyForm, action: e.target.value })}
                        style={{ width: '100%', minHeight: '100px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: '600', fontSize: '14px' }}>
                        Result
                      </label>
                      <textarea
                        placeholder="What was the outcome? Include metrics!"
                        value={storyForm.result}
                        onChange={(e) => setStoryForm({ ...storyForm, result: e.target.value })}
                        style={{ width: '100%', minHeight: '100px' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bullet Points */}
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-sm)', fontWeight: '600', fontSize: '14px' }}>
                    Resume Bullet Points
                  </label>
                  {storyForm.bullet_points.map((bullet, index) => (
                    <div key={index} style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="• Achievement with metrics..."
                        value={bullet}
                        onChange={(e) => updateBulletPoint(index, e.target.value)}
                        style={{ flex: 1 }}
                      />
                      {storyForm.bullet_points.length > 1 && (
                        <button
                          onClick={() => removeBulletPoint(index)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '20px'
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={addBulletPoint} className="btn btn-secondary" style={{ fontSize: '14px' }}>
                    + Add Bullet
                  </button>
                </div>

                {/* Tags/Skills/Metrics */}
                <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: '600', fontSize: '14px' }}>
                      Skills (comma-separated)
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Python, Product Management, Data Analysis"
                      value={Array.isArray(storyForm.skills) ? storyForm.skills.join(', ') : storyForm.skills}
                      onChange={(e) => setStoryForm({ ...storyForm, skills: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: '600', fontSize: '14px' }}>
                      Key Metrics (comma-separated)
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="$500K revenue, 4,685 users, 10% cost reduction"
                      value={Array.isArray(storyForm.metrics) ? storyForm.metrics.join(', ') : storyForm.metrics}
                      onChange={(e) => setStoryForm({ ...storyForm, metrics: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: '600', fontSize: '14px' }}>
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="product-management, AI, leadership"
                      value={Array.isArray(storyForm.tags) ? storyForm.tags.join(', ') : storyForm.tags}
                      onChange={(e) => setStoryForm({ ...storyForm, tags: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleSaveStory}
                    disabled={!storyForm.title}
                  >
                    {editingStory ? 'Update Story' : 'Save Story'}
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => {
                      setShowAddStory(false)
                      setEditingStory(null)
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Story List */}
          {stories.length === 0 && !showAddStory ? (
            <div className="card-premium" style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
              <span className="action-card-icon" style={{ margin: '0 auto var(--space-lg)' }}>
                <WritingIcon />
              </span>
              <h2 style={{ fontSize: '24px', marginBottom: 'var(--space-sm)' }}>No stories yet</h2>
              <p style={{ color: 'var(--text-secondary)' }}>
                Build your story bank! Add your achievements, projects, and experiences in full detail.
                <br />
                You can use these stories when building or tailoring resumes.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
              {stories.map((story) => (
                <div key={story.id} className="card-premium">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
                    <div>
                      <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: 'var(--space-xs)' }}>
                        {story.title}
                      </h3>
                      <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                        {story.company && `${story.company} • `}{story.role}
                      </p>
                      <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: 'var(--space-xs)' }}>
                        Used {story.times_used || 0} times
                      </p>
                    </div>
                    <span style={{
                      background: 'rgba(124, 58, 237, 0.1)',
                      color: 'var(--accent-primary)',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      textTransform: 'capitalize'
                    }}>
                      {story.story_type}
                    </span>
                  </div>

                  {/* STAR Summary */}
                  {(story.situation || story.task || story.action || story.result) && (
                    <div style={{ 
                      background: 'rgba(124, 58, 237, 0.05)', 
                      padding: 'var(--space-md)', 
                      borderRadius: 'var(--radius-md)',
                      marginBottom: 'var(--space-md)',
                      fontSize: '14px',
                      lineHeight: '1.6'
                    }}>
                      {story.situation && <p style={{ marginBottom: 'var(--space-xs)' }}><strong>Situation:</strong> {story.situation}</p>}
                      {story.task && <p style={{ marginBottom: 'var(--space-xs)' }}><strong>Task:</strong> {story.task}</p>}
                      {story.action && <p style={{ marginBottom: 'var(--space-xs)' }}><strong>Action:</strong> {story.action}</p>}
                      {story.result && <p><strong>Result:</strong> {story.result}</p>}
                    </div>
                  )}

                  {/* Bullet Points */}
                  {story.bullet_points && story.bullet_points.length > 0 && (
                    <div style={{ marginBottom: 'var(--space-md)' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: 'var(--space-sm)' }}>Resume Bullets:</h4>
                      <ul style={{ paddingLeft: '20px', fontSize: '14px', lineHeight: '1.6' }}>
                        {story.bullet_points.map((bullet, idx) => (
                          <li key={idx} style={{ marginBottom: 'var(--space-xs)' }}>{bullet}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                    {story.skills && story.skills.map((skill, idx) => (
                      <span key={idx} style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        color: '#2563eb',
                        fontSize: '12px',
                        padding: '4px 12px',
                        borderRadius: '9999px'
                      }}>
                        {skill}
                      </span>
                    ))}
                    {story.metrics && story.metrics.map((metric, idx) => (
                      <span key={idx} style={{
                        background: 'rgba(34, 197, 94, 0.1)',
                        color: '#16a34a',
                        fontSize: '12px',
                        padding: '4px 12px',
                        borderRadius: '9999px'
                      }}>
                        {metric}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <button 
                      className="btn btn-secondary"
                      onClick={() => handleEditStory(story)}
                      style={{ fontSize: '14px', padding: '8px 16px' }}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-ghost"
                      onClick={() => handleDeleteStory(story.id)}
                      style={{ 
                        fontSize: '14px', 
                        padding: '8px 16px',
                        color: 'var(--text-tertiary)',
                        border: '1px solid var(--border-subtle)'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
