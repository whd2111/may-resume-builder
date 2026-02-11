-- Employer Jobs Feature
-- Allows employers to post job openings with descriptions and additional requirements

-- ============================================================================
-- EMPLOYER JOBS TABLE
-- ============================================================================
CREATE TABLE employer_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Job Info
  job_title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  location TEXT,
  job_description TEXT NOT NULL,
  additional_requirements TEXT,
  contact_email TEXT NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'draft')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_employer_jobs_employer_id ON employer_jobs(employer_id);
CREATE INDEX idx_employer_jobs_status ON employer_jobs(status);
CREATE INDEX idx_employer_jobs_created_at ON employer_jobs(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE employer_jobs ENABLE ROW LEVEL SECURITY;

-- Employers can view their own job postings
CREATE POLICY "Employers can view own jobs"
  ON employer_jobs FOR SELECT
  USING (auth.uid() = employer_id);

-- Employers can create job postings
CREATE POLICY "Employers can create jobs"
  ON employer_jobs FOR INSERT
  WITH CHECK (auth.uid() = employer_id);

-- Employers can update their own job postings
CREATE POLICY "Employers can update own jobs"
  ON employer_jobs FOR UPDATE
  USING (auth.uid() = employer_id);

-- Employers can delete their own job postings
CREATE POLICY "Employers can delete own jobs"
  ON employer_jobs FOR DELETE
  USING (auth.uid() = employer_id);

-- All authenticated users can view active job postings (for job-seeker search)
CREATE POLICY "Authenticated users can view active jobs"
  ON employer_jobs FOR SELECT
  USING (status = 'active' AND auth.role() = 'authenticated');

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE TRIGGER update_employer_jobs_updated_at
  BEFORE UPDATE ON employer_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- GRANT ACCESS
-- ============================================================================
GRANT ALL ON employer_jobs TO authenticated;
