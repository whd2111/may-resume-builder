# Resume Bank Setup Guide

The Resume Bank is a powerful system that allows May to learn from a collection of high-quality resumes and apply best practices to future resume writing.

## Overview

The Resume Bank system consists of:

1. **Database Table**: `resume_bank` - stores example resumes with metadata
2. **Upload Interface**: Batch upload component for easy multi-resume uploads
3. **AI Analysis**: Automatic quality scoring and categorization
4. **Learning System**: Featured resumes become reference examples

## Setup Instructions

### 1. Run the Database Migration

You need to run the migration to create the `resume_bank` table in your Supabase database.

**Option A: Via Supabase Dashboard (Recommended)**
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Open the file `supabase/migrations/003_resume_bank.sql`
4. Copy and paste the entire contents into the SQL Editor
5. Click "Run" to execute the migration

**Option B: Via Supabase CLI**
```bash
# If you have Supabase CLI installed
supabase db push
```

### 2. Verify the Migration

After running the migration, verify it was successful:

1. Go to Supabase Dashboard → Table Editor
2. You should see a new table called `resume_bank`
3. It should have the following columns:
   - id, uploaded_by, resume_data, original_text
   - industry, role_level, job_function
   - quality_score, has_metrics, has_strong_action_verbs
   - keywords, notable_features, admin_notes
   - is_approved, is_featured
   - created_at, updated_at

### 3. Access the Resume Bank

1. Log into your May application
2. Navigate to the **Dashboard**
3. Click on the **Resume Bank** tab
4. You'll see the batch upload interface

## How to Use

### Uploading Resumes

1. **Prepare Resume Files**
   - Collect .docx resume files you want May to learn from
   - These should be high-quality, well-formatted resumes
   - Can be from various industries, roles, and experience levels

2. **Batch Upload**
   - Click on the upload area or drag and drop multiple .docx files
   - The system will process each resume automatically:
     - Extract text content
     - Send to Claude AI for analysis
     - Score quality (1-5)
     - Categorize by industry, level, and function
     - Identify notable features and best practices
     - Store in the database

3. **Review Results**
   - After processing, you'll see a summary of each resume
   - High-quality resumes (4-5 stars) are automatically marked as "Featured"
   - Review the AI-generated notes about what makes each resume good/bad

### Resume Categories

**Industries:**
- Tech
- Finance
- Consulting
- Healthcare
- Marketing
- Other

**Role Levels:**
- Entry
- Mid
- Senior
- Executive

**Job Functions:**
- Engineering
- Product
- Marketing
- Sales
- Operations
- Other

### Quality Metrics

Each resume is scored on:
- **Quality Score** (1-5): Overall resume quality
- **Has Metrics**: Whether it includes quantified achievements
- **Strong Action Verbs**: Use of powerful action verbs
- **Formatting Quality**: Excellent/Good/Fair/Poor
- **Notable Features**: Specific best practices demonstrated
- **Keywords**: Key skills and technologies mentioned

## Database Schema

```sql
CREATE TABLE resume_bank (
  -- Core fields
  id UUID PRIMARY KEY,
  resume_data JSONB,
  original_text TEXT,
  
  -- Categorization
  industry TEXT,
  role_level TEXT,
  job_function TEXT,
  
  -- Quality metrics
  quality_score INTEGER (1-5),
  has_metrics BOOLEAN,
  has_strong_action_verbs BOOLEAN,
  formatting_quality TEXT,
  
  -- Learning data
  notable_features TEXT[],
  keywords TEXT[],
  admin_notes TEXT,
  
  -- Status
  is_approved BOOLEAN,
  is_featured BOOLEAN,
  times_referenced INTEGER
)
```

## Future Enhancements

The Resume Bank can be extended with:

1. **Smart Suggestions**: May references similar resumes when helping users
2. **Pattern Learning**: Extract common patterns from high-quality resumes
3. **Template Generation**: Generate resume templates from featured examples
4. **Search & Filter**: Search the bank by industry, skills, quality
5. **Benchmark Comparison**: Compare user resumes against bank averages
6. **Best Practice Library**: Automatic extraction of great bullet points

## Tips for Best Results

1. **Quality over Quantity**: Upload well-written, successful resumes
2. **Diversity**: Include resumes from various industries and levels
3. **Variety**: Mix different resume styles and formats
4. **Annotations**: Review AI notes and add your own observations
5. **Curation**: Regularly review and remove low-quality examples

## Security & Privacy

- Resume bank data is stored in your Supabase database
- Row Level Security (RLS) policies ensure only authenticated users can access
- Original resume text is stored for analysis but not displayed publicly
- You can delete or unapprove resumes at any time

## Troubleshooting

**Upload fails:**
- Ensure you're logged in
- Check that migration was run successfully
- Verify Supabase connection in console

**AI analysis errors:**
- Check Claude API key is valid
- Ensure resume text is extractable from .docx
- Try uploading one resume at a time

**Database errors:**
- Verify RLS policies are enabled
- Check user authentication status
- Review Supabase logs for specific errors

---

Need help? Check the main README or create an issue.
