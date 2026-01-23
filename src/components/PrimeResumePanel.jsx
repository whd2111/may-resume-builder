import { useState, useEffect } from 'react'
import { usePrimeResume } from '../hooks/usePrimeResume'
import { usePrimeBullets } from '../hooks/usePrimeBullets'
import { WritingIcon, TargetIcon } from '../utils/icons'

export default function PrimeResumePanel() {
  const { primeResume, loading: primeLoading, updatePrimeResumeSummary } = usePrimeResume()
  const { 
    bullets, 
    loading: bulletsLoading, 
    createBullet, 
    updateBullet, 
    archiveBullet, 
    restoreBullet,
    fetchBullets,
    getUniqueCompanies,
    getUniqueRoles,
    getUniqueTags,
    getUniqueSkills,
  } = usePrimeBullets(primeResume?.id)

  const [showAddBullet, setShowAddBullet] = useState(false)
  const [editingBullet, setEditingBullet] = useState(null)
  const [showArchived, setShowArchived] = useState(false)
  
  // Search and filter state
  const [searchText, setSearchText] = useState('')
  const [selectedCompany, setSelectedCompany] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  
  // Bullet form state
  const [bulletForm, setBulletForm] = useState({
    company: '',
    role: '',
    bullet_text: '',
    skills: '',
    tags: '',
    start_date: '',
    end_date: '',
  })

  // Refetch bullets when filters change
  useEffect(() => {
    if (primeResume?.id) {
      fetchBullets({
        includeArchived: showArchived,
        searchText: searchText.trim() || undefined,
        tagFilters: selectedTags.length > 0 ? selectedTags : undefined,
      })
    }
  }, [primeResume?.id, showArchived, searchText, selectedTags, fetchBullets])

  const resetForm = () => {
    setBulletForm({
      company: '',
      role: '',
      bullet_text: '',
      skills: '',
      tags: '',
      start_date: '',
      end_date: '',
    })
  }

  const handleAddBullet = () => {
    setEditingBullet(null)
    resetForm()
    setShowAddBullet(true)
  }

  const handleEditBullet = (bullet) => {
    setEditingBullet(bullet)
    setBulletForm({
      company: bullet.company || '',
      role: bullet.role || '',
      bullet_text: bullet.bullet_text || '',
      skills: (bullet.skills || []).join(', '),
      tags: (bullet.tags || []).join(', '),
      start_date: bullet.start_date || '',
      end_date: bullet.end_date || '',
    })
    setShowAddBullet(true)
  }

  const handleSaveBullet = async () => {
    if (!bulletForm.bullet_text.trim()) {
      alert('Bullet text is required')
      return
    }

    try {
      const bulletData = {
        prime_resume_id: primeResume.id,
        company: bulletForm.company.trim() || null,
        role: bulletForm.role.trim() || null,
        bullet_text: bulletForm.bullet_text.trim(),
        skills: bulletForm.skills
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
        tags: bulletForm.tags
          .split(',')
          .map(t => t.trim())
          .filter(Boolean),
        start_date: bulletForm.start_date || null,
        end_date: bulletForm.end_date || null,
        source: 'manual',
      }

      if (editingBullet) {
        await updateBullet(editingBullet.id, bulletData)
      } else {
        await createBullet(bulletData)
      }

      setShowAddBullet(false)
      setEditingBullet(null)
      resetForm()
    } catch (error) {
      alert(`Failed to save bullet: ${error.message}`)
    }
  }

  const handleArchive = async (bulletId) => {
    try {
      await archiveBullet(bulletId)
    } catch (error) {
      alert(`Failed to archive bullet: ${error.message}`)
    }
  }

  const handleRestore = async (bulletId) => {
    try {
      await restoreBullet(bulletId)
    } catch (error) {
      alert(`Failed to restore bullet: ${error.message}`)
    }
  }

  const handleTagClick = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag))
    } else {
      setSelectedTags([...selectedTags, tag])
    }
  }

  // Group bullets by company/role for display
  const groupedBullets = bullets.reduce((acc, bullet) => {
    const key = `${bullet.company || 'Unknown Company'}|${bullet.role || 'Unknown Role'}`
    if (!acc[key]) {
      acc[key] = {
        company: bullet.company || 'Unknown Company',
        role: bullet.role || 'Unknown Role',
        bullets: [],
      }
    }
    acc[key].bullets.push(bullet)
    return acc
  }, {})

  const groupedArray = Object.values(groupedBullets)

  if (primeLoading || bulletsLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
        <div className="loading" />
        <p style={{ marginTop: 'var(--space-md)', color: 'var(--text-secondary)' }}>
          Loading Prime Resume...
        </p>
      </div>
    )
  }

  if (!primeResume) {
    return (
      <div className="card-premium" style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
        <span className="action-card-icon" style={{ margin: '0 auto var(--space-lg)' }}>
          <WritingIcon />
        </span>
        <h2 style={{ fontSize: '24px', marginBottom: 'var(--space-sm)' }}>
          Prime Resume Not Found
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Your Prime Resume will be created automatically. Please refresh the page.
        </p>
      </div>
    )
  }

  const activeBulletCount = bullets.filter(b => b.status === 'active').length
  const archivedBulletCount = bullets.filter(b => b.status === 'archived').length
  const allTags = getUniqueTags()
  const allSkills = getUniqueSkills()
  const allCompanies = getUniqueCompanies()

  return (
    <div>
      {/* Header */}
      <div className="card-premium" style={{ 
        background: 'var(--gradient-primary)', 
        color: 'white',
        marginBottom: 'var(--space-xl)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: 'var(--space-xs)' }}>
              {primeResume.title || 'Prime Resume'}
            </h2>
            <p style={{ opacity: 0.9 }}>
              Your canonical resume knowledge base • {activeBulletCount} active bullets
              {archivedBulletCount > 0 && ` • ${archivedBulletCount} archived`}
            </p>
          </div>
          <button
            className="btn"
            onClick={handleAddBullet}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
            }}
          >
            <WritingIcon />
            Add Bullet
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card-premium" style={{ marginBottom: 'var(--space-xl)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', marginBottom: 'var(--space-md)' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Search bullets..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ flex: '1', minWidth: '200px' }}
          />
          <select
            className="input-field"
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            style={{ minWidth: '150px' }}
          >
            <option value="">All Companies</option>
            {allCompanies.map(company => (
              <option key={company} value={company}>{company}</option>
            ))}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Show Archived
          </label>
        </div>

        {/* Tag filter chips */}
        {allTags.length > 0 && (
          <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
            {allTags.slice(0, 10).map(tag => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                style={{
                  background: selectedTags.includes(tag) ? 'var(--accent-primary)' : 'rgba(124, 58, 237, 0.1)',
                  color: selectedTags.includes(tag) ? 'white' : 'var(--accent-primary)',
                  fontSize: '12px',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {tag}
              </button>
            ))}
            {allTags.length > 10 && (
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', alignSelf: 'center' }}>
                +{allTags.length - 10} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Bullet Modal */}
      {showAddBullet && (
        <div className="card-premium" style={{ 
          marginBottom: 'var(--space-xl)', 
          borderLeft: '4px solid var(--accent-primary)' 
        }}>
          <div className="card-title">
            <WritingIcon />
            {editingBullet ? 'Edit Bullet' : 'Add New Bullet'}
          </div>

          <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: '600', fontSize: '14px' }}>
                  Company
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., Google"
                  value={bulletForm.company}
                  onChange={(e) => setBulletForm({ ...bulletForm, company: e.target.value })}
                  style={{ width: '100%' }}
                  list="companies-list"
                />
                <datalist id="companies-list">
                  {allCompanies.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: '600', fontSize: '14px' }}>
                  Role
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., Senior Product Manager"
                  value={bulletForm.role}
                  onChange={(e) => setBulletForm({ ...bulletForm, role: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: '600', fontSize: '14px' }}>
                  Start Date
                </label>
                <input
                  type="date"
                  className="input-field"
                  value={bulletForm.start_date}
                  onChange={(e) => setBulletForm({ ...bulletForm, start_date: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: '600', fontSize: '14px' }}>
                  End Date (leave empty for current)
                </label>
                <input
                  type="date"
                  className="input-field"
                  value={bulletForm.end_date}
                  onChange={(e) => setBulletForm({ ...bulletForm, end_date: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: '600', fontSize: '14px' }}>
                Bullet Text *
              </label>
              <textarea
                className="input-field"
                placeholder="e.g., Led cross-functional team of 12 to launch new product feature, increasing user engagement by 35% and generating $2M in new revenue"
                value={bulletForm.bullet_text}
                onChange={(e) => setBulletForm({ ...bulletForm, bullet_text: e.target.value })}
                style={{ width: '100%', minHeight: '100px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: '600', fontSize: '14px' }}>
                  Skills (comma-separated)
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Python, SQL, Product Management"
                  value={bulletForm.skills}
                  onChange={(e) => setBulletForm({ ...bulletForm, skills: e.target.value })}
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
                  placeholder="leadership, data-driven, growth"
                  value={bulletForm.tags}
                  onChange={(e) => setBulletForm({ ...bulletForm, tags: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
              <button
                className="btn btn-primary"
                onClick={handleSaveBullet}
                disabled={!bulletForm.bullet_text.trim()}
              >
                {editingBullet ? 'Update Bullet' : 'Save Bullet'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowAddBullet(false)
                  setEditingBullet(null)
                  resetForm()
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bullets List */}
      {bullets.length === 0 ? (
        <div className="card-premium" style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
          <span className="action-card-icon" style={{ margin: '0 auto var(--space-lg)' }}>
            <TargetIcon />
          </span>
          <h2 style={{ fontSize: '24px', marginBottom: 'var(--space-sm)' }}>No bullets yet</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
            {searchText || selectedTags.length > 0 
              ? 'No bullets match your search criteria. Try adjusting filters.'
              : 'Add your first bullet or upload a resume to populate your Prime Resume.'}
          </p>
          {!(searchText || selectedTags.length > 0) && (
            <button className="btn btn-primary" onClick={handleAddBullet}>
              <WritingIcon />
              Add Your First Bullet
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {groupedArray.map((group, groupIdx) => (
            <div key={`${group.company}-${group.role}-${groupIdx}`} className="card-premium">
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: 'var(--space-md)',
                paddingBottom: 'var(--space-md)',
                borderBottom: '1px solid var(--border-subtle)'
              }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: 'var(--space-xs)' }}>
                    {group.company}
                  </h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {group.role} • {group.bullets.length} bullet{group.bullets.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {group.bullets.map((bullet) => (
                  <div 
                    key={bullet.id}
                    style={{
                      padding: 'var(--space-md)',
                      background: bullet.status === 'archived' ? 'rgba(0,0,0,0.03)' : 'rgba(124, 58, 237, 0.03)',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: bullet.status === 'archived' 
                        ? '3px solid var(--text-tertiary)' 
                        : '3px solid var(--accent-primary)',
                      opacity: bullet.status === 'archived' ? 0.7 : 1,
                    }}
                  >
                    <p style={{ 
                      fontSize: '14px', 
                      lineHeight: '1.6', 
                      marginBottom: 'var(--space-sm)',
                      textDecoration: bullet.status === 'archived' ? 'line-through' : 'none',
                    }}>
                      {bullet.bullet_text}
                    </p>

                    {/* Tags and Skills */}
                    <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap', marginBottom: 'var(--space-sm)' }}>
                      {(bullet.skills || []).map((skill, idx) => (
                        <span key={idx} style={{
                          background: 'rgba(59, 130, 246, 0.1)',
                          color: '#2563eb',
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                        }}>
                          {skill}
                        </span>
                      ))}
                      {(bullet.tags || []).map((tag, idx) => (
                        <span key={idx} style={{
                          background: 'rgba(34, 197, 94, 0.1)',
                          color: '#16a34a',
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                        }}>
                          {tag}
                        </span>
                      ))}
                      <span style={{
                        background: 'rgba(0,0,0,0.05)',
                        color: 'var(--text-tertiary)',
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                      }}>
                        {bullet.source}
                      </span>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      <button
                        onClick={() => handleEditBullet(bullet)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-primary)',
                          fontSize: '13px',
                          cursor: 'pointer',
                          padding: '4px 8px',
                        }}
                      >
                        Edit
                      </button>
                      {bullet.status === 'active' ? (
                        <button
                          onClick={() => handleArchive(bullet.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-tertiary)',
                            fontSize: '13px',
                            cursor: 'pointer',
                            padding: '4px 8px',
                          }}
                        >
                          Archive
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRestore(bullet.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#10b981',
                            fontSize: '13px',
                            cursor: 'pointer',
                            padding: '4px 8px',
                          }}
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
