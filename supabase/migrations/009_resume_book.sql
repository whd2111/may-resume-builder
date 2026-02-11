-- Resume Book Feature
-- Allows users to opt-in to CBS Resume Book with their profile

-- ============================================================================
-- RESUME BOOK PROFILES TABLE
-- ============================================================================
CREATE TABLE resume_book_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Basic Info (from resume)
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  location TEXT,
  
  -- Links
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  other_url TEXT,
  
  -- Resume reference
  resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
  resume_snapshot JSONB, -- Snapshot of resume data at time of submission
  
  -- Graduation info
  graduation_year INTEGER,
  degree_program TEXT, -- e.g., "MBA", "EMBA", "MS"
  concentration TEXT, -- e.g., "Finance", "Marketing"
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true, -- Can be made private
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_resume_book_user_id ON resume_book_profiles(user_id);
CREATE INDEX idx_resume_book_active ON resume_book_profiles(is_active, is_public);
CREATE INDEX idx_resume_book_graduation_year ON resume_book_profiles(graduation_year);

-- Constraint: One active profile per user
CREATE UNIQUE INDEX unique_active_profile_per_user 
  ON resume_book_profiles(user_id) 
  WHERE is_active = true;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE resume_book_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own resume book profile"
  ON resume_book_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can create resume book profile"
  ON resume_book_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own resume book profile"
  ON resume_book_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own profile
CREATE POLICY "Users can delete own resume book profile"
  ON resume_book_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Public profiles can be viewed by anyone (for CBS admin/recruiter access)
CREATE POLICY "Public profiles are viewable by authenticated users"
  ON resume_book_profiles FOR SELECT
  USING (is_public = true AND is_active = true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE TRIGGER update_resume_book_profiles_updated_at
  BEFORE UPDATE ON resume_book_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- GRANT ACCESS
-- ============================================================================
GRANT ALL ON resume_book_profiles TO authenticated;
