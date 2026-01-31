# Quick Test Guide: Resume Validator

## What Was Fixed

1. **Added validation agent** to catch nonsensical content (like "martial arts" at marketing agencies)
2. **Enhanced prompts** to prevent hallucinations in the first place
3. **Better context passing** so the AI knows what company/role each bullet is from

## Quick Test (5 minutes)

### Step 1: Start the App

```bash
npm run dev
```

### Step 2: Navigate to Tailoring

1. Go to "Tailor for Jobs"
2. Click "Single Job"
3. Look at the subtitle - it should show which resume is being used

### Step 3: Paste a Job Description

Use any job description. Example:

```
Marketing Manager - Acme Corp

Responsibilities:
- Develop marketing strategies
- Manage social media campaigns
- Analyze customer data
- Create content for campaigns

Requirements:
- 3+ years marketing experience
- Strong analytical skills
- Experience with Google Analytics
- Excellent communication skills
```

### Step 4: Click "Analyze & Tailor Resume"

Watch the loading stages:
1. "Extracting job requirements..."
2. "Scoring and selecting bullets..."
3. "Tailoring selected bullets..."
4. **"Validating tailored content..."** ← NEW!

### Step 5: Check the Results

After tailoring completes, you should see:

1. **"Tailoring Complete"** card (green)
2. **"Validation: X/100"** card ← NEW!
   - Click to expand and see any issues detected
   - If score < 70, there will be warnings/errors listed

### Step 6: Check Browser Console

Open DevTools (F12 or Cmd+Option+I) and look for:

```
Using primary resume for tailoring: { name: 'Your Name', experienceCount: 3, ... }
```

This shows which resume data is being used.

## What to Look For

### ✅ Good Result
- Validation score: 90-100
- Green checkmark ✅
- No issues listed
- Resume looks correct

### ⚠️ Warning Result
- Validation score: 70-89
- Yellow checkmark ✓
- Minor issues listed
- Resume probably still usable

### ❌ Critical Issues
- Validation score: < 70
- Orange/red warning icon
- **Alert popup**: "Warning: The tailored resume may contain nonsensical content"
- Critical issues listed like:
  - "Mentions 'martial arts' at Ogilvy & Mather"
  - "Mentions 'coaching' at PwC (consulting firm)"
- **DO NOT USE** - the tailoring went wrong

## Testing the Original Bug

If you want to test that the validator catches the "martial arts at Ogilvy" bug:

### Option 1: Manual Test
1. Build a resume with Ogilvy & Mather as Marketing Intern
2. Make sure there's NO martial arts content in the resume
3. Tailor for any job
4. If "martial arts" appears, validator should flag it as critical

### Option 2: Check Console
Look for messages like:
```
Quick validation found critical issues: [
  {
    severity: 'critical',
    issue: 'Mentions "martial arts" at Ogilvy & Mather',
    context: 'Ogilvy & Mather is a marketing/advertising company...'
  }
]
```

## If Something Goes Wrong

### Issue: Validation takes too long
- This is normal - validation adds 2-4 seconds
- You'll see "Validating tailored content..." loading message

### Issue: False positive (validator flags good content)
- This can happen
- You can still download/save the resume
- Validation is advisory, not blocking

### Issue: Validation fails with error
- The resume will still be shown
- A warning message will appear
- You can still use the resume

## Resume Data Freshness

To verify you're using the latest resume:

1. Note the resume name and experience count in the subtitle
2. Go to "Build Resume" and check your resume
3. Make a change (add/remove a bullet)
4. Save it
5. Go back to "Tailor for Jobs"
6. Check the subtitle - it should reflect your changes

## Success Criteria

✅ The validator catches nonsensical content  
✅ You see validation scores after tailoring  
✅ Critical issues trigger warning alerts  
✅ Resume metadata shows correct version  
✅ Console logs show correct resume data  

## Need Help?

Check `RESUME_VALIDATOR_IMPLEMENTATION.md` for:
- Full technical details
- Architecture explanation
- Debugging guide
- How to extend validation rules

## Quick Disable (if needed)

If validation causes problems, you can disable it by commenting out one line:

In `src/components/Stage2Tailor.jsx`, find:
```javascript
// Step 4: Validate the tailored resume
setLoadingStage('validating')
await handleValidation(tailored, extractedChecklist, bullets)
```

Comment it out:
```javascript
// Step 4: Validate the tailored resume (DISABLED)
// setLoadingStage('validating')
// await handleValidation(tailored, extractedChecklist, bullets)
setTailoredResume(tailored)
setRewrittenBullets(bullets)
```

This bypasses validation entirely.
