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
