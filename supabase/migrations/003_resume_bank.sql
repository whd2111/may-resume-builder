-- Resume Bank Migration
-- This creates a separate bank of example resumes for May to learn from

-- ============================================================================
-- RESUME BANK TABLE
-- ============================================================================
CREATE TABLE resume_bank (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Uploaded by (admin/user who added it)
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Resume content
  resume_data JSONB NOT NULL,
  original_text TEXT, -- Raw text extracted from original file
  
  -- Metadata for categorization and learning
  source_filename TEXT,
  industry TEXT, -- e.g., 'tech', 'finance', 'consulting', 'healthcare'
  role_level TEXT, -- e.g., 'entry', 'mid', 'senior', 'executive'
  job_function TEXT, -- e.g., 'engineering', 'product', 'marketing', 'sales'
  
  -- Quality and learning metrics
  quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 5), -- 1-5 rating
  has_metrics BOOLEAN DEFAULT false, -- Does it have quantified achievements?
  has_strong_action_verbs BOOLEAN DEFAULT false,
  formatting_quality TEXT, -- 'excellent', 'good', 'fair', 'poor'
  
  -- Tags for searching and learning
  notable_features TEXT[], -- e.g., ['strong-metrics', 'leadership', 'technical-depth']
  keywords TEXT[], -- Key skills/technologies mentioned
  
  -- Notes
  admin_notes TEXT, -- Why this resume is good/bad, what to learn from it
  
  -- Usage tracking
  times_referenced INTEGER DEFAULT 0, -- How many times used as example
  
  -- Status
  is_approved BOOLEAN DEFAULT true, -- Can be used for learning
  is_featured BOOLEAN DEFAULT false, -- Highlighted as exceptional example
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_resume_bank_industry ON resume_bank(industry);
CREATE INDEX idx_resume_bank_role_level ON resume_bank(role_level);
CREATE INDEX idx_resume_bank_job_function ON resume_bank(job_function);
CREATE INDEX idx_resume_bank_quality_score ON resume_bank(quality_score DESC);
CREATE INDEX idx_resume_bank_is_approved ON resume_bank(is_approved) WHERE is_approved = true;
CREATE INDEX idx_resume_bank_is_featured ON resume_bank(is_featured) WHERE is_featured = true;
CREATE INDEX idx_resume_bank_keywords ON resume_bank USING GIN(keywords);
CREATE INDEX idx_resume_bank_notable_features ON resume_bank USING GIN(notable_features);
CREATE INDEX idx_resume_bank_created_at ON resume_bank(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE resume_bank ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read approved resumes (for learning)
CREATE POLICY "Authenticated users can view approved resumes"
  ON resume_bank FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_approved = true);

-- Only authenticated users can insert (you can add admin check later)
CREATE POLICY "Authenticated users can insert resumes"
  ON resume_bank FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update resumes they uploaded (or add admin check)
CREATE POLICY "Users can update own uploaded resumes"
  ON resume_bank FOR UPDATE
  USING (auth.uid() = uploaded_by);

-- Users can delete resumes they uploaded (or add admin check)
CREATE POLICY "Users can delete own uploaded resumes"
  ON resume_bank FOR DELETE
  USING (auth.uid() = uploaded_by);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update timestamp
CREATE TRIGGER update_resume_bank_updated_at
  BEFORE UPDATE ON resume_bank
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View for featured/high-quality resumes
CREATE VIEW featured_resumes AS
SELECT 
  id,
  industry,
  role_level,
  job_function,
  quality_score,
  notable_features,
  keywords,
  admin_notes,
  created_at
FROM resume_bank
WHERE is_approved = true AND (is_featured = true OR quality_score >= 4)
ORDER BY quality_score DESC, created_at DESC;

-- View for resume bank statistics
CREATE VIEW resume_bank_stats AS
SELECT 
  industry,
  role_level,
  job_function,
  COUNT(*) as total_resumes,
  AVG(quality_score) as avg_quality,
  COUNT(*) FILTER (WHERE has_metrics = true) as resumes_with_metrics,
  COUNT(*) FILTER (WHERE is_featured = true) as featured_count
FROM resume_bank
WHERE is_approved = true
GROUP BY industry, role_level, job_function;

-- ============================================================================
-- DONE!
-- ============================================================================
