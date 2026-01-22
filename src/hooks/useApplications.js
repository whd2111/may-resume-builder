import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export const useApplications = () => {
  const { user } = useAuth()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch all applications for the current user
  const fetchApplications = async () => {
    if (!user) {
      setApplications([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setApplications(data || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching applications:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Create a new application
  const createApplication = async (applicationData) => {
    if (!user) throw new Error('Must be logged in to create application')

    try {
      const { data, error } = await supabase
        .from('applications')
        .insert({
          user_id: user.id,
          job_description: applicationData.job_description,
          company_name: applicationData.company_name,
          job_title: applicationData.job_title,
          checklist_json: applicationData.checklist_json,
          selection_json: applicationData.selection_json,
          resume_id: applicationData.resume_id,
          tailored_resume_data: applicationData.tailored_resume_data,
          status: applicationData.status || 'tailored',
        })
        .select()
        .single()

      if (error) throw error

      await fetchApplications() // Refresh list
      return data
    } catch (err) {
      console.error('Error creating application:', err)
      throw err
    }
  }

  // Update an existing application
  const updateApplication = async (applicationId, updates) => {
    if (!user) throw new Error('Must be logged in to update application')

    try {
      const { data, error } = await supabase
        .from('applications')
        .update(updates)
        .eq('id', applicationId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error

      await fetchApplications() // Refresh list
      return data
    } catch (err) {
      console.error('Error updating application:', err)
      throw err
    }
  }

  // Delete an application
  const deleteApplication = async (applicationId) => {
    if (!user) throw new Error('Must be logged in to delete application')

    try {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', applicationId)
        .eq('user_id', user.id)

      if (error) throw error

      await fetchApplications() // Refresh list
    } catch (err) {
      console.error('Error deleting application:', err)
      throw err
    }
  }

  // Update application status
  const updateStatus = async (applicationId, status) => {
    return updateApplication(applicationId, { status })
  }

  useEffect(() => {
    fetchApplications()
  }, [user])

  return {
    applications,
    loading,
    error,
    createApplication,
    updateApplication,
    deleteApplication,
    updateStatus,
    refetch: fetchApplications,
  }
}
