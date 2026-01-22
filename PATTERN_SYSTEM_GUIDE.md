# Pattern Extraction & Query System

## Overview

May now has a **dynamic learning system** that analyzes your resume bank and extracts actionable patterns, examples, and insights. Instead of static best practices, May learns from real, high-quality resumes.

## How It Works

```
Resume Bank (100+ resumes)
         ↓
Pattern Extractor analyzes
         ↓
Stores in 3 tables:
  - resume_patterns (action verbs, metrics, structures)
  - resume_examples (great bullets & descriptions)
  - pattern_insights (high-level insights)
         ↓
Query system retrieves relevant patterns
         ↓
May uses them when helping users
```

## Setup (3 Steps)

### 1. Run Database Migrations

You need to run TWO migrations in Supabase SQL Editor:

**Migration 1:** `supabase/migrations/004_fix_resume_bank_rls.sql`
- Fixes RLS policy for uploads

**Migration 2:** `supabase/migrations/005_resume_patterns.sql`
- Creates pattern tables
- Creates example tables
- Creates insights tables

### 2. Upload Resumes (if not done)

1. Home page → Click "Resume Bank" button (bottom)
2. Enter password: `resume`
3. Click "Upload Resumes to Bank"
4. Drag & drop your PDF/DOCX files
5. Wait for AI analysis

### 3. Extract Patterns

1. Home page → Click "Resume Bank" button
2. Enter password: `resume`
3. Click "Extract Patterns"
4. Click "Start Pattern Extraction"
5. Wait 5-15 minutes (depends on resume count)

## What Gets Extracted

### 1. Action Verbs
```javascript
{
  verb: "Led",
  example: "Led cross-functional team of 12 to launch product, increasing revenue by 45%",
  effectiveness: "Shows leadership + quantifiable impact",
  frequency: 15  // Appeared in 15 high-quality resumes
}
```

### 2. Metric Formats
```javascript
{
  format: "Increased X by Y%",
  example: "Increased user engagement by 67% through personalization",
  effectiveness: "Clear before/after with percentage",
  frequency: 23
}
```

### 3. Bullet Structures
```javascript
{
  structure: "Action verb + what + result with metric",
  example: "Built automated testing framework, reducing bug count by 40%",
  effectiveness: "Clear action, deliverable, measurable outcome",
  frequency: 31
}
```

### 4. Skill Descriptions
```javascript
{
  skill: "Python",
  example: "Architected scalable Python microservices handling 1M+ requests/day",
  effectiveness: "Shows skill in context with scale/impact"
}
```

### 5. Insights
```javascript
{
  title: "Top resumes quantify impact",
  description: "95% of 4-5 star resumes include specific metrics in every bullet",
  confidence: 0.95
}
```

## Database Schema

### `resume_patterns`
Stores extracted patterns by type:
- `action_verb` - Strong verbs that appear frequently
- `metric_format` - How achievements are quantified
- `bullet_structure` - Proven bullet formats
- `skill_description` - How to describe skills

Filters: industry, role_level, job_function

### `resume_examples`
Best bullets and sections:
- High-quality examples (4-5 stars only)
- Categorized by type, industry, role
- Tagged with strengths and analysis

### `pattern_insights`
High-level insights:
- Industry trends
- Role requirements
- Quality indicators
- Common mistakes to avoid

## Query Functions

Located in `src/utils/patternQueries.js`:

### Get Top Action Verbs
```javascript
import { getTopActionVerbs } from '../utils/patternQueries'

const verbs = await getTopActionVerbs({
  industry: 'tech',
  job_function: 'engineering'
})
// Returns top 20 action verbs for tech engineers
```

### Get Metric Formats
```javascript
const metrics = await getMetricFormats({ industry: 'tech' })
// Returns effective ways to quantify achievements
```

### Get Skill Examples
```javascript
const examples = await getSkillExamples('Python', {
  industry: 'tech',
  role_level: 'senior'
})
// Returns 5 examples of how senior engineers describe Python
```

### Get May's Knowledge Package
```javascript
import { getMayKnowledge } from '../utils/patternQueries'

const knowledge = await getMayKnowledge({
  industry: 'tech',
  role_level: 'senior',
  job_function: 'engineering'
})
// Returns comprehensive package of patterns, examples, insights
```

## Using in May's Prompts

The query system includes a helper to enhance May's prompts:

```javascript
import { getMayKnowledge, buildEnhancedPrompt } from '../utils/patternQueries'

// Get patterns for user's context
const knowledge = await getMayKnowledge({
  industry: userIndustry,
  job_function: userFunction
})

// Enhance the system prompt
const enhancedPrompt = buildEnhancedPrompt(
  ORIGINAL_SYSTEM_PROMPT,
  knowledge
)

// Use with Claude
const response = await callClaude(messages, enhancedPrompt)
```

This automatically adds:
- Top 8 action verbs with examples
- Top 5 metric formats
- Top 3 bullet structures
- Key insights

## Next Steps (Integration)

### Phase 1: Basic Integration ✅ (Done)
- Database schema created
- Pattern extraction working
- Query functions ready

### Phase 2: Chatbot Integration (Next)
Update `Stage1Chatbot.jsx` to:
```javascript
// On component mount or when user provides context
const knowledge = await getMayKnowledge({
  industry: userIndustry,
  role_level: userLevel,
  job_function: userFunction
})

// Use enhanced prompt
const systemPrompt = buildEnhancedPrompt(BASE_PROMPT, knowledge)
```

### Phase 3: Contextual Examples (Future)
Show examples while user types:
```javascript
// When user describes an achievement
const similarExamples = await getSimilarExamples(userText, {
  industry: userIndustry
})
// Display: "Here's how top resumes describe this..."
```

### Phase 4: Real-time Suggestions (Future)
Suggest improvements based on patterns:
```javascript
// Detect weak language
if (userBullet.includes('responsible for')) {
  const betterVerbs = await getTopActionVerbs()
  // Suggest: "Try these instead: Led, Drove, Managed..."
}
```

## Example Workflow

**User:** "I'm a senior product manager in tech"

**May (behind the scenes):**
1. Queries patterns for `industry=tech`, `job_function=product`, `role_level=senior`
2. Gets top action verbs: "Drove", "Led", "Launched", "Spearheaded"
3. Gets metric formats: "Increased X by Y%", "$X revenue impact"
4. Gets insights: "Top PM resumes emphasize user impact + revenue"
5. Enhances prompt with these patterns

**May (to user):**
"Based on 15 high-quality product manager resumes, here's how to describe your work:

- Use verbs like 'Drove', 'Led', 'Launched'
- Quantify impact: 'Increased engagement by X%' or '$X revenue'
- Example: 'Drove product roadmap for ML features, increasing MAU by 45%'"

## Performance

- **Pattern extraction**: 5-15 minutes for 100 resumes
- **Queries**: <100ms per query
- **Storage**: ~50KB per resume in patterns

## Maintenance

**When to re-run extraction:**
- After uploading 20+ new resumes
- Quarterly to catch new trends
- When expanding to new industries/roles

**Automatic updates (future):**
- Extract patterns incrementally on each upload
- Update frequency counts in real-time
- Flag outdated patterns

## Advanced: Custom Patterns

You can add custom patterns directly:

```javascript
await supabase.from('resume_patterns').insert({
  pattern_type: 'custom_rule',
  category: 'universal',
  pattern_value: 'No personal pronouns',
  description: 'Never use I, me, my in resume bullets',
  frequency: 100
})
```

## Troubleshooting

**Pattern extraction fails:**
- Check Claude API key is valid
- Ensure enough high-quality resumes (min 10)
- Check browser console for errors

**Queries return empty:**
- Run pattern extraction first
- Check filters aren't too restrictive
- Verify patterns table has data in Supabase

**Slow performance:**
- Queries are cached, first call may be slow
- Consider limiting result counts
- Check database indexes exist

---

**You now have a dynamic, data-driven system for May to learn and improve!** 🎉

The more high-quality resumes you add, the smarter May becomes.
