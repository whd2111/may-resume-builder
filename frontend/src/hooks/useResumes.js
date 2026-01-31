import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export const useResumes = () => {
  const { user } = useAuth()
  const [resumes, setResumes] = useState([])
  const [masterResume, setMasterResume] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch all resumes for the current user
  const fetchResumes = async () => {
    if (!user) {
      setResumes([])
      setMasterResume(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setResumes(data || [])
      setMasterResume(data?.find(r => r.is_master) || null)
      setError(null)
    } catch (err) {
      console.error('Error fetching resumes:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Create a new resume
  const createResume = async (title, resumeData, isMaster = false, tailoredFor = null) => {
    if (!user) throw new Error('Must be logged in to create resume')

    try {
      const { data, error } = await supabase
        .from('resumes')
        .insert({
          user_id: user.id,
          title,
          resume_data: resumeData,
          is_master: isMaster,
          tailored_for: tailoredFor,
        })
        .select()
        .single()

      if (error) throw error

      await fetchResumes() // Refresh list
      return data
    } catch (err) {
      console.error('Error creating resume:', err)
      throw err
    }
  }

  // Update an existing resume
  const updateResume = async (resumeId, updates) => {
    if (!user) throw new Error('Must be logged in to update resume')

    try {
      const { data, error } = await supabase
        .from('resumes')
        .update(updates)
        .eq('id', resumeId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error

      await fetchResumes() // Refresh list
      return data
    } catch (err) {
      console.error('Error updating resume:', err)
      throw err
    }
  }

  // Delete a resume
  const deleteResume = async (resumeId) => {
    if (!user) throw new Error('Must be logged in to delete resume')

    try {
      const { error } = await supabase
        .from('resumes')
        .delete()
        .eq('id', resumeId)
        .eq('user_id', user.id)

      if (error) throw error

      await fetchResumes() // Refresh list
    } catch (err) {
      console.error('Error deleting resume:', err)
      throw err
    }
  }

  // Set a resume as the master resume
  const setAsMaster = async (resumeId) => {
    if (!user) throw new Error('Must be logged in')

    try {
      // First, unset any existing master
      await supabase
        .from('resumes')
        .update({ is_master: false })
        .eq('user_id', user.id)
        .eq('is_master', true)

      // Then set the new master
      const { data, error } = await supabase
        .from('resumes')
        .update({ is_master: true })
        .eq('id', resumeId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error

      await fetchResumes() // Refresh list
      return data
    } catch (err) {
      console.error('Error setting master resume:', err)
      throw err
    }
  }

  // Duplicate a resume
  const duplicateResume = async (resumeId, newTitle) => {
    if (!user) throw new Error('Must be logged in')

    try {
      // Get the original resume
      const { data: original, error: fetchError } = await supabase
        .from('resumes')
        .select('*')
        .eq('id', resumeId)
        .eq('user_id', user.id)
        .single()

      if (fetchError) throw fetchError

      // Create a duplicate
      const { data, error } = await supabase
        .from('resumes')
        .insert({
          user_id: user.id,
          title: newTitle || `${original.title} (Copy)`,
          resume_data: original.resume_data,
          is_master: false,
          source_resume_id: resumeId,
          tags: original.tags,
        })
        .select()
        .single()

      if (error) throw error

      await fetchResumes() // Refresh list
      return data
    } catch (err) {
      console.error('Error duplicating resume:', err)
      throw err
    }
  }

  useEffect(() => {
    fetchResumes()
  }, [user])

  return {
    resumes,
    masterResume,
    loading,
    error,
    createResume,
    updateResume,
    deleteResume,
    setAsMaster,
    duplicateResume,
    refetch: fetchResumes,
  }
}
