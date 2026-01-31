# Quick Resume Upload Guide

## TL;DR - 3 Steps to Upload Resumes

### 1. Run the Database Migration

Open Supabase SQL Editor and run this file:
```
supabase/migrations/003_resume_bank.sql
```

### 2. Access Resume Bank

1. Open May Resume Builder
2. Go to **Dashboard**
3. Click **Resume Bank** tab

### 3. Upload Resumes

- **Drag & Drop** multiple .docx files into the upload area
- Click **Upload** button
- Wait for AI to analyze each resume
- Review results

## What You'll Need

- ✅ Collection of .docx resume files
- ✅ Supabase project setup
- ✅ Claude API key configured
- ✅ May Resume Builder running

## What Happens During Upload

For each resume:
1. ⚡ Extracts text from .docx file
2. 🤖 Sends to Claude AI for analysis
3. 📊 Scores quality (1-5 stars)
4. 🏷️ Categorizes (industry, level, function)
5. 💾 Saves to database

Processing time: ~5-10 seconds per resume

## Easy Ways to Get Resumes

### Option 1: Personal Collection
- Ask friends/colleagues for their resumes
- Use your own past versions
- Request from mentees or students

### Option 2: Online Resources
- University career centers (with permission)
- Resume review communities (anonymized)
- Professional networking groups

### Option 3: Templates & Examples
- Professional resume templates (filled versions)
- Industry-specific examples
- Role-specific samples

## Tips for Fast Batch Uploads

1. **Organize First**: 
   - Put all .docx files in one folder
   - Remove duplicates
   - Check files open correctly

2. **Upload in Batches**:
   - Start with 5-10 resumes to test
   - Then upload larger batches (20-50)
   - Review results between batches

3. **Mix Quality Levels**:
   - Include excellent resumes (4-5 stars)
   - Include good resumes (3 stars)
   - Include poor resumes (1-2 stars) - May learns what to avoid!

4. **Categorize Mentally**:
   - Group by industry if possible
   - Note which are entry-level vs senior
   - Identify standout examples

## After Upload

- ⭐ **Featured resumes** (4-5 stars) automatically highlighted
- 📝 Review AI analysis notes
- 🔍 Check categorization accuracy
- ✏️ Add your own observations (future feature)

## Keyboard Shortcuts

- Drop files anywhere on upload screen
- Multiple file selection: Ctrl/Cmd + Click
- Select all in folder: Ctrl/Cmd + A

## Expected Results

**High-Quality Resume (4-5 stars)**
- Strong action verbs
- Quantified achievements
- Clear structure
- Industry-specific keywords
- Professional formatting

**Low-Quality Resume (1-2 stars)**
- Weak language ("responsible for", "helped")
- Missing metrics
- Vague descriptions
- Poor formatting
- Generic content

## Common Issues

**File won't upload:**
- Must be .docx format (not .doc, .pdf, or .txt)
- File shouldn't be corrupted
- Try opening in Word first to verify

**Slow processing:**
- Normal: 5-10 seconds per resume
- Claude API may have rate limits
- Upload smaller batches if timing out

**AI analysis seems off:**
- AI does its best but isn't perfect
- Review and mentally note corrections
- Future: manual override feature

## What's Next?

After building your resume bank:
1. May can reference these when helping you write
2. Compare your resume to high-quality examples
3. Learn patterns from featured resumes
4. Extract best practices automatically

---

**Ready to start?** Just drag and drop those .docx files! 🚀
