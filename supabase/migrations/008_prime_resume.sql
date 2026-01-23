-- Prime Resume Migration
-- Creates tables for the canonical "Prime Resume" (bullet/story library)
-- that becomes the source of truth for all job-specific tailored resumes.

-- ============================================================================
-- PRIME RESUMES TABLE
-- One per user - the canonical, always-up-to-date resume knowledge base
-- ============================================================================
CREATE TABLE prime_resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Metadata
  title TEXT DEFAULT 'Prime Resume',
  
  -- Summary/header info (contact, summary statement, etc.)
  summary_json JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_prime_resumes_user_id ON prime_resumes(user_id);

-- ============================================================================
-- PRIME BULLETS TABLE
-- Individual bullets/achievements that make up the Prime Resume
-- ============================================================================
CREATE TABLE prime_bullets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prime_resume_id UUID REFERENCES prime_resumes(id) ON DELETE CASCADE NOT NULL,
  
  -- Experience context
  company TEXT,
  role TEXT,
  start_date DATE,
  end_date DATE,
  
  -- The actual bullet content
  bullet_text TEXT NOT NULL,
  
  -- Enrichment data
  metrics TEXT[] DEFAULT '{}',
  skills TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  
  -- Provenance tracking
  -- source: where this bullet came from
  -- 'import' = from initial resume upload
  -- 'chatbot' = generated/refined by chatbot
  -- 'manual' = manually added by user
  -- 'tailored_promoted' = promoted from a tailored resume
  source TEXT NOT NULL DEFAULT 'import',
  
  -- Status: active bullets are used for tailoring, archived are hidden
  status TEXT NOT NULL DEFAULT 'active',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_prime_bullets_user_id ON prime_bullets(user_id);
CREATE INDEX idx_prime_bullets_prime_resume_id ON prime_bullets(prime_resume_id);
CREATE INDEX idx_prime_bullets_status ON prime_bullets(status);
CREATE INDEX idx_prime_bullets_company_role ON prime_bullets(company, role);

-- GIN indexes for array filtering
CREATE INDEX idx_prime_bullets_tags ON prime_bullets USING GIN(tags);
CREATE INDEX idx_prime_bullets_skills ON prime_bullets USING GIN(skills);
CREATE INDEX idx_prime_bullets_metrics ON prime_bullets USING GIN(metrics);

-- Full-text search index on bullet_text
CREATE INDEX idx_prime_bullets_text_search ON prime_bullets USING GIN(to_tsvector('english', bullet_text));

-- ============================================================================
-- PROVENANCE COLUMNS FOR RESUMES TABLE
-- Track which Prime Resume and Application a tailored resume came from
-- ============================================================================
ALTER TABLE resumes
  ADD COLUMN IF NOT EXISTS prime_resume_id UUID REFERENCES prime_resumes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES applications(id) ON DELETE SET NULL;

-- Indexes for provenance lookups
CREATE INDEX IF NOT EXISTS idx_resumes_prime_resume_id ON resumes(prime_resume_id);
CREATE INDEX IF NOT EXISTS idx_resumes_application_id ON resumes(application_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE prime_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE prime_bullets ENABLE ROW LEVEL SECURITY;

-- PRIME_RESUMES policies
CREATE POLICY "Users can view own prime resume"
  ON prime_resumes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prime resume"
  ON prime_resumes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prime resume"
  ON prime_resumes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prime resume"
  ON prime_resumes FOR DELETE
  USING (auth.uid() = user_id);

-- PRIME_BULLETS policies
CREATE POLICY "Users can view own prime bullets"
  ON prime_bullets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prime bullets"
  ON prime_bullets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prime bullets"
  ON prime_bullets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prime bullets"
  ON prime_bullets FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS FOR updated_at
-- Reuses the existing update_updated_at_column() function from 001_initial_schema.sql
-- ============================================================================

CREATE TRIGGER update_prime_resumes_updated_at
  BEFORE UPDATE ON prime_resumes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prime_bullets_updated_at
  BEFORE UPDATE ON prime_bullets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- GRANT ACCESS
-- ============================================================================

GRANT ALL ON prime_resumes TO authenticated;
GRANT ALL ON prime_bullets TO authenticated;
