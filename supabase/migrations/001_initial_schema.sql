-- May Resume Builder - Initial Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- RESUMES TABLE
-- ============================================================================
CREATE TABLE resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Metadata
  title TEXT NOT NULL,
  is_master BOOLEAN DEFAULT false,
  
  -- Resume content (JSON structure)
  resume_data JSONB NOT NULL,
  
  -- Tailoring info
  tailored_for TEXT, -- Job description or company name
  source_resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
  
  -- Search/filtering
  tags TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_resumes_user_id ON resumes(user_id);
CREATE INDEX idx_resumes_is_master ON resumes(user_id, is_master) WHERE is_master = true;
CREATE INDEX idx_resumes_created_at ON resumes(created_at DESC);
CREATE INDEX idx_resumes_tags ON resumes USING GIN(tags);

-- Constraint: Only one master resume per user
CREATE UNIQUE INDEX unique_master_per_user ON resumes(user_id) WHERE is_master = true;

-- ============================================================================
-- STORIES TABLE (Experience Library)
-- ============================================================================
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Basic info
  title TEXT NOT NULL,
  company TEXT,
  role TEXT,
  story_type TEXT, -- 'achievement', 'project', 'leadership', 'technical'
  
  -- STAR format content
  situation TEXT,
  task TEXT,
  action TEXT,
  result TEXT,
  
  -- Pre-written bullets
  bullet_points TEXT[] DEFAULT '{}',
  
  -- Metadata for search
  skills TEXT[] DEFAULT '{}',
  metrics TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  
  -- Usage tracking
  times_used INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_stories_user_id ON stories(user_id);
CREATE INDEX idx_stories_tags ON stories USING GIN(tags);
CREATE INDEX idx_stories_skills ON stories USING GIN(skills);
CREATE INDEX idx_stories_times_used ON stories(times_used DESC);

-- ============================================================================
-- CHAT SESSIONS TABLE (Optional - for conversation history)
-- ============================================================================
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
  
  -- Chat data
  messages JSONB DEFAULT '[]',
  status TEXT DEFAULT 'in-progress', -- 'in-progress', 'completed', 'abandoned'
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_resume_id ON chat_sessions(resume_id);
CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);

-- ============================================================================
-- USER PREFERENCES TABLE
-- ============================================================================
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Default personal info (auto-fill for new resumes)
  default_name TEXT,
  default_email TEXT,
  default_phone TEXT,
  default_linkedin TEXT,
  default_location TEXT,
  
  -- Settings
  preferred_format TEXT DEFAULT 'modern',
  auto_save BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RESUMES policies
CREATE POLICY "Users can view own resumes"
  ON resumes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own resumes"
  ON resumes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own resumes"
  ON resumes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own resumes"
  ON resumes FOR DELETE
  USING (auth.uid() = user_id);

-- STORIES policies
CREATE POLICY "Users can view own stories"
  ON stories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stories"
  ON stories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stories"
  ON stories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own stories"
  ON stories FOR DELETE
  USING (auth.uid() = user_id);

-- CHAT_SESSIONS policies
CREATE POLICY "Users can view own chat sessions"
  ON chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat sessions"
  ON chat_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat sessions"
  ON chat_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- USER_PREFERENCES policies
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
  ON user_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
CREATE TRIGGER update_resumes_updated_at
  BEFORE UPDATE ON resumes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stories_updated_at
  BEFORE UPDATE ON stories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA / HELPERS
-- ============================================================================

-- Function to create default preferences for new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_preferences (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create preferences on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- DONE!
-- ============================================================================

-- Grant access to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
