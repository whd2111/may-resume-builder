-- Applications table to store job applications with checklist data
-- This enables the new job description → checklist → bullet scoring pipeline

CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Job information
  job_description TEXT NOT NULL,
  company_name TEXT,
  job_title TEXT,
  
  -- Extracted checklist (structured job requirements)
  checklist_json JSONB,
  
  -- Bullet selection results
  selection_json JSONB,
  
  -- Associated resume
  resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
  tailored_resume_data JSONB,
  
  -- Status tracking
  status TEXT DEFAULT 'draft', -- 'draft', 'checklist_extracted', 'bullets_selected', 'tailored', 'applied'
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_resume_id ON applications(resume_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_created_at ON applications(created_at DESC);

-- Enable RLS
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own applications"
  ON applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own applications"
  ON applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own applications"
  ON applications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own applications"
  ON applications FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update trigger
CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant access
GRANT ALL ON applications TO authenticated;
