-- Resume Patterns System
-- Stores extracted patterns and insights from the resume bank

-- ============================================================================
-- RESUME PATTERNS TABLE
-- ============================================================================
CREATE TABLE resume_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Pattern metadata
  pattern_type TEXT NOT NULL, -- 'action_verb', 'metric_format', 'bullet_structure', 'skill_description', etc.
  category TEXT, -- 'universal', 'industry_specific', 'role_specific'
  
  -- Filters
  industry TEXT, -- null = universal
  role_level TEXT, -- null = universal
  job_function TEXT, -- null = universal
  
  -- Pattern data
  pattern_value TEXT NOT NULL, -- The actual pattern (e.g., "Led", "Increased X by Y%")
  example_text TEXT, -- Example of pattern in use
  frequency INTEGER DEFAULT 1, -- How many times this pattern appears
  avg_quality_score DECIMAL(3,2), -- Average quality of resumes using this pattern
  
  -- Context
  description TEXT, -- Why this pattern is effective
  usage_notes TEXT, -- When/how to use this pattern
  
  -- Source tracking
  source_resume_ids UUID[], -- Which resumes contributed to this pattern
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_patterns_type ON resume_patterns(pattern_type);
CREATE INDEX idx_patterns_category ON resume_patterns(category);
CREATE INDEX idx_patterns_industry ON resume_patterns(industry);
CREATE INDEX idx_patterns_role_level ON resume_patterns(role_level);
CREATE INDEX idx_patterns_job_function ON resume_patterns(job_function);
CREATE INDEX idx_patterns_frequency ON resume_patterns(frequency DESC);
CREATE INDEX idx_patterns_quality ON resume_patterns(avg_quality_score DESC);

-- ============================================================================
-- RESUME EXAMPLES TABLE (Best bullets/sections)
-- ============================================================================
CREATE TABLE resume_examples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Example metadata
  example_type TEXT NOT NULL, -- 'bullet', 'summary', 'skill_list', 'achievement'
  
  -- Filters
  industry TEXT,
  role_level TEXT,
  job_function TEXT,
  skill_focus TEXT[], -- e.g., ['leadership', 'python', 'product-management']
  
  -- Example data
  example_text TEXT NOT NULL,
  quality_score INTEGER, -- 1-5
  
  -- Why it's good
  strengths TEXT[], -- e.g., ['strong-metrics', 'clear-impact', 'concise']
  analysis TEXT, -- Why this example is effective
  
  -- Source
  source_resume_id UUID REFERENCES resume_bank(id) ON DELETE SET NULL,
  source_context TEXT, -- Which company/role this came from
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_examples_type ON resume_examples(example_type);
CREATE INDEX idx_examples_industry ON resume_examples(industry);
CREATE INDEX idx_examples_role_level ON resume_examples(role_level);
CREATE INDEX idx_examples_job_function ON resume_examples(job_function);
CREATE INDEX idx_examples_quality ON resume_examples(quality_score DESC);
CREATE INDEX idx_examples_skills ON resume_examples USING GIN(skill_focus);
CREATE INDEX idx_examples_strengths ON resume_examples USING GIN(strengths);

-- ============================================================================
-- PATTERN INSIGHTS TABLE (High-level insights)
-- ============================================================================
CREATE TABLE pattern_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Insight metadata
  insight_type TEXT NOT NULL, -- 'industry_trend', 'role_requirement', 'quality_indicator', 'common_mistake'
  
  -- Filters
  industry TEXT,
  role_level TEXT,
  job_function TEXT,
  
  -- Insight data
  insight_title TEXT NOT NULL,
  insight_description TEXT NOT NULL,
  confidence_score DECIMAL(3,2), -- 0.0 to 1.0
  
  -- Evidence
  supporting_data JSONB, -- Statistical evidence
  example_count INTEGER, -- How many resumes support this insight
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_insights_type ON pattern_insights(insight_type);
CREATE INDEX idx_insights_industry ON pattern_insights(industry);
CREATE INDEX idx_insights_confidence ON pattern_insights(confidence_score DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE resume_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_insights ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all patterns and examples
CREATE POLICY "Users can view patterns"
  ON resume_patterns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can view examples"
  ON resume_examples FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can view insights"
  ON pattern_insights FOR SELECT
  TO authenticated
  USING (true);

-- Only allow inserts for pattern extraction (can add admin check later)
CREATE POLICY "Allow pattern insertion"
  ON resume_patterns FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow example insertion"
  ON resume_examples FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow insight insertion"
  ON pattern_insights FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_patterns_updated_at
  BEFORE UPDATE ON resume_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_examples_updated_at
  BEFORE UPDATE ON resume_examples
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_insights_updated_at
  BEFORE UPDATE ON pattern_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- Top patterns by frequency and quality
CREATE VIEW top_patterns AS
SELECT 
  pattern_type,
  pattern_value,
  example_text,
  frequency,
  avg_quality_score,
  industry,
  role_level,
  job_function
FROM resume_patterns
WHERE frequency >= 3 AND avg_quality_score >= 4.0
ORDER BY frequency DESC, avg_quality_score DESC
LIMIT 100;

-- Best examples by quality
CREATE VIEW best_examples AS
SELECT 
  example_type,
  example_text,
  quality_score,
  industry,
  role_level,
  job_function,
  strengths,
  analysis
FROM resume_examples
WHERE quality_score >= 4
ORDER BY quality_score DESC;

-- ============================================================================
-- DONE!
-- ============================================================================
