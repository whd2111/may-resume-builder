import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export const usePrimeResume = () => {
  const { user } = useAuth()
  const [primeResume, setPrimeResume] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch the user's prime resume
  const fetchPrimeResume = useCallback(async () => {
    if (!user) {
      setPrimeResume(null)
      setLoading(false)
      return null
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('prime_resumes')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is okay
        throw error
      }

      setPrimeResume(data || null)
      setError(null)
      return data
    } catch (err) {
      console.error('Error fetching prime resume:', err)
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [user])

  // Create a new prime resume for the user (should only be called once per user)
  const createPrimeResume = async (summaryJson = {}) => {
    if (!user) throw new Error('Must be logged in to create prime resume')

    try {
      const { data, error } = await supabase
        .from('prime_resumes')
        .insert({
          user_id: user.id,
          title: 'Prime Resume',
          summary_json: summaryJson,
        })
        .select()
        .single()

      if (error) throw error

      setPrimeResume(data)
      return data
    } catch (err) {
      console.error('Error creating prime resume:', err)
      throw err
    }
  }

  // Ensure the user has a prime resume (create if doesn't exist)
  // Returns the existing or newly created prime resume
  const ensurePrimeResume = useCallback(async () => {
    if (!user) return null

    try {
      // First check if one exists
      const { data: existing, error: fetchError } = await supabase
        .from('prime_resumes')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError
      }

      if (existing) {
        setPrimeResume(existing)
        return existing
      }

      // Create a new one
      const { data: created, error: createError } = await supabase
        .from('prime_resumes')
        .insert({
          user_id: user.id,
          title: 'Prime Resume',
          summary_json: {},
        })
        .select()
        .single()

      if (createError) throw createError

      setPrimeResume(created)
      return created
    } catch (err) {
      console.error('Error ensuring prime resume:', err)
      throw err
    }
  }, [user])

  // Update the prime resume summary
  const updatePrimeResumeSummary = async (summaryUpdates) => {
    if (!user) throw new Error('Must be logged in to update prime resume')
    if (!primeResume) throw new Error('No prime resume exists')

    try {
      // Merge with existing summary
      const newSummary = {
        ...primeResume.summary_json,
        ...summaryUpdates,
      }

      const { data, error } = await supabase
        .from('prime_resumes')
        .update({ summary_json: newSummary })
        .eq('id', primeResume.id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error

      setPrimeResume(data)
      return data
    } catch (err) {
      console.error('Error updating prime resume summary:', err)
      throw err
    }
  }

  // Update title
  const updateTitle = async (title) => {
    if (!user) throw new Error('Must be logged in to update prime resume')
    if (!primeResume) throw new Error('No prime resume exists')

    try {
      const { data, error } = await supabase
        .from('prime_resumes')
        .update({ title })
        .eq('id', primeResume.id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error

      setPrimeResume(data)
      return data
    } catch (err) {
      console.error('Error updating prime resume title:', err)
      throw err
    }
  }

  useEffect(() => {
    fetchPrimeResume()
  }, [fetchPrimeResume])

  return {
    primeResume,
    loading,
    error,
    fetchPrimeResume,
    createPrimeResume,
    ensurePrimeResume,
    updatePrimeResumeSummary,
    updateTitle,
    refetch: fetchPrimeResume,
  }
}
