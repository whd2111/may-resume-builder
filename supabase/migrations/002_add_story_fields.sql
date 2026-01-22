-- Add additional story fields for detailed story tracking
-- Run this in your Supabase SQL editor

-- Add new columns to stories table
ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS company TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS story_type TEXT DEFAULT 'achievement',
  ADD COLUMN IF NOT EXISTS situation TEXT,
  ADD COLUMN IF NOT EXISTS task TEXT,
  ADD COLUMN IF NOT EXISTS action TEXT,
  ADD COLUMN IF NOT EXISTS result TEXT,
  ADD COLUMN IF NOT EXISTS bullet_points TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS metrics TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS times_used INTEGER DEFAULT 0;

-- Update the content column to be nullable (since we now have STAR fields)
ALTER TABLE stories ALTER COLUMN content DROP NOT NULL;

-- Add index for story type filtering
CREATE INDEX IF NOT EXISTS idx_stories_type ON stories(story_type);

-- Add index for times_used for sorting
CREATE INDEX IF NOT EXISTS idx_stories_times_used ON stories(times_used DESC);

-- Create function to increment story usage (optional but useful)
CREATE OR REPLACE FUNCTION increment_story_usage(story_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE stories
  SET times_used = times_used + 1
  WHERE id = story_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
