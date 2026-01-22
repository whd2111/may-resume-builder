-- Allow anonymous uploads to resume bank
-- The resume bank is password-protected in the UI, so authentication isn't needed

-- Drop the existing authenticated-only policy
DROP POLICY IF EXISTS "Allow authenticated users to upload resumes" ON resume_bank;

-- Create a new policy that allows anyone to insert
CREATE POLICY "Allow anonymous resume uploads"
  ON resume_bank FOR INSERT
  WITH CHECK (true);

-- Also allow anonymous users to read approved resumes (for pattern extraction)
DROP POLICY IF EXISTS "Users can view all approved resumes" ON resume_bank;

CREATE POLICY "Anyone can view approved resumes"
  ON resume_bank FOR SELECT
  USING (is_approved = true);

-- Allow anonymous pattern/example inserts (for pattern extraction without login)
DROP POLICY IF EXISTS "Allow pattern insertion" ON resume_patterns;
DROP POLICY IF EXISTS "Allow example insertion" ON resume_examples;
DROP POLICY IF EXISTS "Allow insight insertion" ON pattern_insights;

CREATE POLICY "Allow anonymous pattern insertion"
  ON resume_patterns FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anonymous example insertion"
  ON resume_examples FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anonymous insight insertion"
  ON pattern_insights FOR INSERT
  WITH CHECK (true);

-- Allow anonymous reads for patterns
DROP POLICY IF EXISTS "Users can view patterns" ON resume_patterns;
DROP POLICY IF EXISTS "Users can view examples" ON resume_examples;
DROP POLICY IF EXISTS "Users can view insights" ON pattern_insights;

CREATE POLICY "Anyone can view patterns"
  ON resume_patterns FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view examples"
  ON resume_examples FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view insights"
  ON pattern_insights FOR SELECT
  USING (true);
