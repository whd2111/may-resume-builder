import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export const useStories = () => {
  const { user } = useAuth()
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch all stories for the current user
  const fetchStories = async () => {
    if (!user) {
      setStories([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('user_id', user.id)
        .order('times_used', { ascending: false })

      if (error) throw error

      setStories(data || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching stories:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Create a new story
  const createStory = async (storyData) => {
    if (!user) throw new Error('Must be logged in to create story')

    try {
      const { data, error } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          ...storyData,
        })
        .select()
        .single()

      if (error) throw error

      await fetchStories() // Refresh list
      return data
    } catch (err) {
      console.error('Error creating story:', err)
      throw err
    }
  }

  // Update an existing story
  const updateStory = async (storyId, updates) => {
    if (!user) throw new Error('Must be logged in to update story')

    try {
      const { data, error } = await supabase
        .from('stories')
        .update(updates)
        .eq('id', storyId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error

      await fetchStories() // Refresh list
      return data
    } catch (err) {
      console.error('Error updating story:', err)
      throw err
    }
  }

  // Delete a story
  const deleteStory = async (storyId) => {
    if (!user) throw new Error('Must be logged in to delete story')

    try {
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId)
        .eq('user_id', user.id)

      if (error) throw error

      await fetchStories() // Refresh list
    } catch (err) {
      console.error('Error deleting story:', err)
      throw err
    }
  }

  // Increment usage count for a story
  const incrementUsage = async (storyId) => {
    if (!user) throw new Error('Must be logged in')

    try {
      const { error } = await supabase.rpc('increment_story_usage', {
        story_id: storyId,
      })

      if (error) {
        // Fallback if RPC doesn't exist
        const story = stories.find(s => s.id === storyId)
        if (story) {
          await updateStory(storyId, {
            times_used: (story.times_used || 0) + 1,
          })
        }
      } else {
        await fetchStories() // Refresh list
      }
    } catch (err) {
      console.error('Error incrementing usage:', err)
    }
  }

  // Search stories by tags, skills, or text
  const searchStories = async (query) => {
    if (!user) return []

    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('user_id', user.id)
        .or(`title.ilike.%${query}%,company.ilike.%${query}%,tags.cs.{${query}},skills.cs.{${query}}`)
        .order('times_used', { ascending: false })

      if (error) throw error

      return data || []
    } catch (err) {
      console.error('Error searching stories:', err)
      return []
    }
  }

  useEffect(() => {
    fetchStories()
  }, [user])

  return {
    stories,
    loading,
    error,
    createStory,
    updateStory,
    deleteStory,
    incrementUsage,
    searchStories,
    refetch: fetchStories,
  }
}
