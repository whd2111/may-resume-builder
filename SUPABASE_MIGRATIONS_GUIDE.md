# Supabase Migrations - Quick Guide

Run these migrations in order to set up the pattern system.

## How to Run Migrations

1. Open your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **+ New query**
4. Copy and paste the migration SQL
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. Wait for "Success" message
7. Repeat for next migration

## Migration 1: Fix Resume Bank RLS

**File:** `supabase/migrations/004_fix_resume_bank_rls.sql`

**What it does:** Fixes Row Level Security so you can upload resumes

**Copy this:**
```sql
-- Fix Resume Bank RLS Policy
-- Allow authenticated users to insert resumes without additional restrictions

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Authenticated users can insert resumes" ON resume_bank;

-- Create a more permissive policy for inserts
-- Any authenticated user can insert (password protection is handled in the UI)
CREATE POLICY "Allow authenticated users to upload resumes"
  ON resume_bank FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Also make sure users can read their own uploads
DROP POLICY IF EXISTS "Authenticated users can view approved resumes" ON resume_bank;

CREATE POLICY "Users can view all approved resumes"
  ON resume_bank FOR SELECT
  TO authenticated
  USING (is_approved = true);
```

✅ Click **Run** and wait for success

---

## Migration 2: Create Pattern Tables

**File:** `supabase/migrations/005_resume_patterns.sql`

**What it does:** Creates 3 new tables for storing patterns, examples, and insights

**This file is LARGE** (200+ lines). Here's the easy way:

### Option A: Copy from File
1. Open `supabase/migrations/005_resume_patterns.sql` in your editor
2. Select all (Cmd/Ctrl + A)
3. Copy (Cmd/Ctrl + C)
4. Paste into Supabase SQL Editor
5. Click **Run**

### Option B: Copy Below
<details>
<summary>Click to expand full SQL</summary>

```sql
-- Resume Patterns System
-- Stores extracted patterns and insights from the resume bank

-- ============================================================================
-- RESUME PATTERNS TABLE
-- ============================================================================
CREATE TABLE resume_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Pattern metadata
  pattern_type TEXT NOT NULL,
  category TEXT,
  
  -- Filters
  industry TEXT,
  role_level TEXT,
  job_function TEXT,
  
  -- Pattern data
  pattern_value TEXT NOT NULL,
  example_text TEXT,
  frequency INTEGER DEFAULT 1,
  avg_quality_score DECIMAL(3,2),
  
  -- Context
  description TEXT,
  usage_notes TEXT,
  
  -- Source tracking
  source_resume_ids UUID[],
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_patterns_type ON resume_patterns(pattern_type);
CREATE INDEX idx_patterns_category ON resume_patterns(category);
CREATE INDEX idx_patterns_industry ON resume_patterns(industry);
CREATE INDEX idx_patterns_role_level ON resume_patterns(role_level);
CREATE INDEX idx_patterns_job_function ON resume_patterns(job_function);
CREATE INDEX idx_patterns_frequency ON resume_patterns(frequency DESC);
CREATE INDEX idx_patterns_quality ON resume_patterns(avg_quality_score DESC);

-- ============================================================================
-- RESUME EXAMPLES TABLE
-- ============================================================================
CREATE TABLE resume_examples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Example metadata
  example_type TEXT NOT NULL,
  
  -- Filters
  industry TEXT,
  role_level TEXT,
  job_function TEXT,
  skill_focus TEXT[],
  
  -- Example data
  example_text TEXT NOT NULL,
  quality_score INTEGER,
  
  -- Why it's good
  strengths TEXT[],
  analysis TEXT,
  
  -- Source
  source_resume_id UUID REFERENCES resume_bank(id) ON DELETE SET NULL,
  source_context TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_examples_type ON resume_examples(example_type);
CREATE INDEX idx_examples_industry ON resume_examples(industry);
CREATE INDEX idx_examples_role_level ON resume_examples(role_level);
CREATE INDEX idx_examples_job_function ON resume_examples(job_function);
CREATE INDEX idx_examples_quality ON resume_examples(quality_score DESC);
CREATE INDEX idx_examples_skills ON resume_examples USING GIN(skill_focus);
CREATE INDEX idx_examples_strengths ON resume_examples USING GIN(strengths);

-- ============================================================================
-- PATTERN INSIGHTS TABLE
-- ============================================================================
CREATE TABLE pattern_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Insight metadata
  insight_type TEXT NOT NULL,
  
  -- Filters
  industry TEXT,
  role_level TEXT,
  job_function TEXT,
  
  -- Insight data
  insight_title TEXT NOT NULL,
  insight_description TEXT NOT NULL,
  confidence_score DECIMAL(3,2),
  
  -- Evidence
  supporting_data JSONB,
  example_count INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_insights_type ON pattern_insights(insight_type);
CREATE INDEX idx_insights_industry ON pattern_insights(industry);
CREATE INDEX idx_insights_confidence ON pattern_insights(confidence_score DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE resume_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_insights ENABLE ROW LEVEL SECURITY;

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
```
</details>

✅ Click **Run** and wait for success (may take 5-10 seconds)

---

## Verify Success

After running both migrations, check:

1. **Table Editor** → You should see new tables:
   - `resume_patterns`
   - `resume_examples`
   - `pattern_insights`

2. **Views** → You should see:
   - `top_patterns`
   - `best_examples`

If you see these, migrations succeeded! ✅

---

## Troubleshooting

**Error: "relation already exists"**
- Migration was already run, you're good!

**Error: "function update_updated_at_column does not exist"**
- Run migration `001_initial_schema.sql` first

**Error: permission denied**
- Make sure you're running as project owner/admin

---

## What's Next?

After migrations succeed:
1. Upload resumes to the bank
2. Run pattern extraction
3. May will automatically use learned patterns!

See `PATTERN_SYSTEM_GUIDE.md` for full details.
