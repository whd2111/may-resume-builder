import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export const usePrimeBullets = (primeResumeId = null) => {
  const { user } = useAuth()
  const [bullets, setBullets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Normalize bullet text for deduplication
  const normalizeBulletText = (text) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
  }

  // Fetch bullets with optional filters
  const fetchBullets = useCallback(async (options = {}) => {
    const { includeArchived = false, searchText, tagFilters, skillFilters } = options

    if (!user) {
      setBullets([])
      setLoading(false)
      return []
    }

    try {
      setLoading(true)
      let query = supabase
        .from('prime_bullets')
        .select('*')
        .eq('user_id', user.id)

      // Filter by prime_resume_id if provided
      if (primeResumeId) {
        query = query.eq('prime_resume_id', primeResumeId)
      }

      // Filter by status (exclude archived by default)
      if (!includeArchived) {
        query = query.eq('status', 'active')
      }

      // Full-text search on bullet_text
      if (searchText && searchText.trim()) {
        query = query.ilike('bullet_text', `%${searchText.trim()}%`)
      }

      // Filter by tags (array overlap)
      if (tagFilters && tagFilters.length > 0) {
        query = query.overlaps('tags', tagFilters)
      }

      // Filter by skills (array overlap)
      if (skillFilters && skillFilters.length > 0) {
        query = query.overlaps('skills', skillFilters)
      }

      // Order by company, role, then created_at for grouping
      query = query.order('company', { ascending: true, nullsFirst: false })
        .order('role', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) throw error

      setBullets(data || [])
      setError(null)
      return data || []
    } catch (err) {
      console.error('Error fetching prime bullets:', err)
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }, [user, primeResumeId])

  // Create a new bullet with deduplication check
  const createBullet = async (bulletData) => {
    if (!user) throw new Error('Must be logged in to create bullet')
    if (!bulletData.prime_resume_id) throw new Error('prime_resume_id is required')

    try {
      // Check for exact duplicates (normalized text match)
      const normalizedNew = normalizeBulletText(bulletData.bullet_text)
      const { data: existing } = await supabase
        .from('prime_bullets')
        .select('id, bullet_text')
        .eq('user_id', user.id)
        .eq('prime_resume_id', bulletData.prime_resume_id)
        .eq('status', 'active')

      const isDuplicate = (existing || []).some(
        b => normalizeBulletText(b.bullet_text) === normalizedNew
      )

      if (isDuplicate) {
        console.warn('Duplicate bullet detected, skipping:', bulletData.bullet_text.substring(0, 50))
        return null
      }

      const { data, error } = await supabase
        .from('prime_bullets')
        .insert({
          user_id: user.id,
          prime_resume_id: bulletData.prime_resume_id,
          company: bulletData.company || null,
          role: bulletData.role || null,
          start_date: bulletData.start_date || null,
          end_date: bulletData.end_date || null,
          bullet_text: bulletData.bullet_text,
          metrics: bulletData.metrics || [],
          skills: bulletData.skills || [],
          tags: bulletData.tags || [],
          source: bulletData.source || 'manual',
          status: 'active',
        })
        .select()
        .single()

      if (error) throw error

      await fetchBullets()
      return data
    } catch (err) {
      console.error('Error creating prime bullet:', err)
      throw err
    }
  }

  // Create multiple bullets at once (for import)
  const createBulletsBatch = async (bulletsArray) => {
    if (!user) throw new Error('Must be logged in to create bullets')
    if (!bulletsArray || bulletsArray.length === 0) return []

    try {
      // Get existing bullets for deduplication
      const primeResumeId = bulletsArray[0]?.prime_resume_id
      const { data: existing } = await supabase
        .from('prime_bullets')
        .select('bullet_text')
        .eq('user_id', user.id)
        .eq('prime_resume_id', primeResumeId)
        .eq('status', 'active')

      const existingNormalized = new Set(
        (existing || []).map(b => normalizeBulletText(b.bullet_text))
      )

      // Filter out duplicates
      const uniqueBullets = bulletsArray.filter(bullet => {
        const normalized = normalizeBulletText(bullet.bullet_text)
        if (existingNormalized.has(normalized)) {
          return false
        }
        existingNormalized.add(normalized) // Prevent duplicates within batch
        return true
      })

      if (uniqueBullets.length === 0) {
        console.log('All bullets were duplicates, nothing to insert')
        return []
      }

      const toInsert = uniqueBullets.map(bullet => ({
        user_id: user.id,
        prime_resume_id: bullet.prime_resume_id,
        company: bullet.company || null,
        role: bullet.role || null,
        start_date: bullet.start_date || null,
        end_date: bullet.end_date || null,
        bullet_text: bullet.bullet_text,
        metrics: bullet.metrics || [],
        skills: bullet.skills || [],
        tags: bullet.tags || [],
        source: bullet.source || 'import',
        status: 'active',
      }))

      const { data, error } = await supabase
        .from('prime_bullets')
        .insert(toInsert)
        .select()

      if (error) throw error

      await fetchBullets()
      return data || []
    } catch (err) {
      console.error('Error creating prime bullets batch:', err)
      throw err
    }
  }

  // Update a bullet
  const updateBullet = async (bulletId, updates) => {
    if (!user) throw new Error('Must be logged in to update bullet')

    try {
      const { data, error } = await supabase
        .from('prime_bullets')
        .update({
          ...updates,
          // Don't allow changing user_id or prime_resume_id
          user_id: undefined,
          prime_resume_id: undefined,
        })
        .eq('id', bulletId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error

      await fetchBullets()
      return data
    } catch (err) {
      console.error('Error updating prime bullet:', err)
      throw err
    }
  }

  // Archive a bullet (soft delete)
  const archiveBullet = async (bulletId) => {
    return updateBullet(bulletId, { status: 'archived' })
  }

  // Restore an archived bullet
  const restoreBullet = async (bulletId) => {
    return updateBullet(bulletId, { status: 'active' })
  }

  // Hard delete a bullet
  const deleteBullet = async (bulletId) => {
    if (!user) throw new Error('Must be logged in to delete bullet')

    try {
      const { error } = await supabase
        .from('prime_bullets')
        .delete()
        .eq('id', bulletId)
        .eq('user_id', user.id)

      if (error) throw error

      await fetchBullets()
    } catch (err) {
      console.error('Error deleting prime bullet:', err)
      throw err
    }
  }

  // Get unique companies from bullets
  const getUniqueCompanies = () => {
    const companies = [...new Set(bullets.map(b => b.company).filter(Boolean))]
    return companies.sort()
  }

  // Get unique roles from bullets
  const getUniqueRoles = () => {
    const roles = [...new Set(bullets.map(b => b.role).filter(Boolean))]
    return roles.sort()
  }

  // Get unique tags from bullets
  const getUniqueTags = () => {
    const tags = new Set()
    bullets.forEach(b => (b.tags || []).forEach(t => tags.add(t)))
    return [...tags].sort()
  }

  // Get unique skills from bullets
  const getUniqueSkills = () => {
    const skills = new Set()
    bullets.forEach(b => (b.skills || []).forEach(s => skills.add(s)))
    return [...skills].sort()
  }

  // Group bullets by company/role
  const getBulletsGroupedByExperience = () => {
    const groups = {}
    bullets.forEach(bullet => {
      const key = `${bullet.company || 'Unknown Company'}|${bullet.role || 'Unknown Role'}`
      if (!groups[key]) {
        groups[key] = {
          company: bullet.company || 'Unknown Company',
          role: bullet.role || 'Unknown Role',
          bullets: [],
        }
      }
      groups[key].bullets.push(bullet)
    })
    return Object.values(groups)
  }

  useEffect(() => {
    fetchBullets()
  }, [fetchBullets])

  return {
    bullets,
    loading,
    error,
    fetchBullets,
    createBullet,
    createBulletsBatch,
    updateBullet,
    archiveBullet,
    restoreBullet,
    deleteBullet,
    getUniqueCompanies,
    getUniqueRoles,
    getUniqueTags,
    getUniqueSkills,
    getBulletsGroupedByExperience,
    refetch: fetchBullets,
  }
}
