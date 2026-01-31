import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/**
 * Hook for interacting with the resume bank
 * Provides access to example resumes for learning and reference
 */
export function useResumeBank() {
  const { user } = useAuth()
  const [bankResumes, setBankResumes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch all approved resumes from the bank
  const fetchBankResumes = async (filters = {}) => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('resume_bank')
        .select('*')
        .eq('is_approved', true)
        .order('quality_score', { ascending: false })
        .order('created_at', { ascending: false })

      // Apply filters if provided
      if (filters.industry) {
        query = query.eq('industry', filters.industry)
      }
      if (filters.role_level) {
        query = query.eq('role_level', filters.role_level)
      }
      if (filters.job_function) {
        query = query.eq('job_function', filters.job_function)
      }
      if (filters.min_quality_score) {
        query = query.gte('quality_score', filters.min_quality_score)
      }
      if (filters.is_featured) {
        query = query.eq('is_featured', true)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setBankResumes(data || [])
      return data || []
    } catch (err) {
      console.error('Error fetching resume bank:', err)
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }

  // Get featured resumes only (4-5 stars)
  const getFeaturedResumes = async () => {
    return fetchBankResumes({ is_featured: true })
  }

  // Get resumes by category
  const getResumesByCategory = async (industry, role_level, job_function) => {
    return fetchBankResumes({
      industry,
      role_level,
      job_function,
      min_quality_score: 3 // Only decent quality and above
    })
  }

  // Search resumes by keywords
  const searchResumes = async (keyword) => {
    try {
      const { data, error } = await supabase
        .from('resume_bank')
        .select('*')
        .eq('is_approved', true)
        .contains('keywords', [keyword])
        .order('quality_score', { ascending: false })

      if (error) throw error
      return data || []
    } catch (err) {
      console.error('Error searching resumes:', err)
      return []
    }
  }

  // Get resume statistics
  const getStats = async () => {
    try {
      const { data, error } = await supabase
        .from('resume_bank_stats')
        .select('*')

      if (error) throw error
      return data || []
    } catch (err) {
      console.error('Error fetching stats:', err)
      return []
    }
  }

  // Increment reference counter when a resume is used
  const incrementReferenceCount = async (resumeId) => {
    try {
      const { error } = await supabase
        .rpc('increment', { 
          row_id: resumeId,
          table_name: 'resume_bank',
          column_name: 'times_referenced'
        })

      if (error) {
        // If RPC doesn't exist, fallback to manual increment
        const { data: resume } = await supabase
          .from('resume_bank')
          .select('times_referenced')
          .eq('id', resumeId)
          .single()

        if (resume) {
          await supabase
            .from('resume_bank')
            .update({ times_referenced: (resume.times_referenced || 0) + 1 })
            .eq('id', resumeId)
        }
      }
    } catch (err) {
      console.error('Error incrementing reference count:', err)
    }
  }

  // Get best practices from high-quality resumes
  const getBestPractices = async () => {
    try {
      const { data, error } = await supabase
        .from('resume_bank')
        .select('notable_features, admin_notes, resume_data')
        .eq('is_approved', true)
        .gte('quality_score', 4)
        .order('quality_score', { ascending: false })
        .limit(10)

      if (error) throw error

      // Extract all notable features and best practices
      const features = new Set()
      const notes = []

      data.forEach(resume => {
        resume.notable_features?.forEach(f => features.add(f))
        if (resume.admin_notes) {
          notes.push(resume.admin_notes)
        }
      })

      return {
        features: Array.from(features),
        notes,
        examples: data
      }
    } catch (err) {
      console.error('Error fetching best practices:', err)
      return { features: [], notes: [], examples: [] }
    }
  }

  // Get example bullets for a specific skill or achievement type
  const getExampleBullets = async (skill) => {
    try {
      const { data, error } = await supabase
        .from('resume_bank')
        .select('resume_data')
        .eq('is_approved', true)
        .gte('quality_score', 4)
        .contains('keywords', [skill])

      if (error) throw error

      // Extract all bullets from experience sections
      const bullets = []
      data.forEach(resume => {
        resume.resume_data?.experience?.forEach(exp => {
          exp.bullets?.forEach(bullet => {
            if (bullet.toLowerCase().includes(skill.toLowerCase())) {
              bullets.push({
                bullet,
                company: exp.company,
                title: exp.title
              })
            }
          })
        })
      })

      return bullets
    } catch (err) {
      console.error('Error fetching example bullets:', err)
      return []
    }
  }

  // Initial load
  useEffect(() => {
    if (user) {
      fetchBankResumes()
    }
  }, [user])

  return {
    bankResumes,
    loading,
    error,
    fetchBankResumes,
    getFeaturedResumes,
    getResumesByCategory,
    searchResumes,
    getStats,
    incrementReferenceCount,
    getBestPractices,
    getExampleBullets
  }
}
