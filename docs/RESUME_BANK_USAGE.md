# Resume Bank Usage Examples

This document shows how to use the Resume Bank data in your May application to provide intelligent, data-driven resume assistance.

## Using the Hook

```javascript
import { useResumeBank } from '../hooks/useResumeBank'

function MyComponent() {
  const {
    bankResumes,
    loading,
    getFeaturedResumes,
    getResumesByCategory,
    searchResumes,
    getBestPractices,
    getExampleBullets,
    incrementReferenceCount
  } = useResumeBank()
  
  // Use the data...
}
```

## Use Case 1: Show Example Bullets

When a user is writing resume bullets, show them examples from high-quality resumes:

```javascript
// In Stage1Chatbot or BuildResume component
const showExampleBullets = async (skill) => {
  const examples = await getExampleBullets('product management')
  
  // Display to user:
  // "Here are some strong examples from our resume bank:"
  // • Led product roadmap for ML-powered recommendation engine, 
  //   increasing user engagement by 45% (Amazon, Senior PM)
  // • Drove $2M revenue growth through data-driven feature prioritization
  //   (Google, Product Manager)
}
```

## Use Case 2: Smart Suggestions Based on Industry

When building a resume, suggest patterns from similar resumes:

```javascript
// When user indicates industry and role
const provideSuggestions = async (industry, roleLevel) => {
  const similarResumes = await getResumesByCategory(
    industry, 
    roleLevel, 
    'engineering'
  )
  
  // Analyze common patterns
  const commonSkills = extractCommonSkills(similarResumes)
  const commonBulletPatterns = extractBulletPatterns(similarResumes)
  
  // Suggest to user:
  // "Based on 15 high-quality senior engineering resumes in tech, 
  //  I recommend highlighting: [skills]"
}
```

## Use Case 3: Resume Critique & Comparison

Compare user's resume against bank averages:

```javascript
const critiqueResume = async (userResume, industry, roleLevel) => {
  // Get comparable resumes from bank
  const benchmarks = await getResumesByCategory(industry, roleLevel)
  
  // Calculate metrics
  const avgBulletLength = calculateAvgBulletLength(benchmarks)
  const avgBulletsPerJob = calculateAvgBulletsPerJob(benchmarks)
  const commonActionVerbs = extractActionVerbs(benchmarks)
  
  // Compare user's resume
  const userBulletLength = calculateAvgBulletLength([userResume])
  const userBulletsPerJob = calculateAvgBulletsPerJob([userResume])
  
  // Provide feedback:
  // "Your bullets average 2.3 lines vs 1.8 for top resumes - 
  //  consider making them more concise"
}
```

## Use Case 4: Enhanced AI Prompts

Include best practices in Claude prompts:

```javascript
const buildResumeWithContext = async (userInfo) => {
  // Get best practices from bank
  const { features, notes, examples } = await getBestPractices()
  
  // Enhance Claude prompt
  const systemPrompt = `
    You are May, an expert resume builder.
    
    Based on analysis of ${examples.length} high-quality resumes:
    
    BEST PRACTICES OBSERVED:
    ${features.join('\n- ')}
    
    EXPERT NOTES:
    ${notes.slice(0, 5).join('\n- ')}
    
    EXAMPLE STRONG BULLETS:
    ${extractTopBullets(examples, 10).join('\n- ')}
    
    Now help the user build their resume following these patterns...
  `
  
  // Send enhanced prompt to Claude
}
```

## Use Case 5: Template Generation

Generate resume templates from featured resumes:

```javascript
const generateTemplate = async (industry, roleLevel) => {
  const featuredResumes = await getFeaturedResumes()
  
  // Filter by criteria
  const relevant = featuredResumes.filter(r => 
    r.industry === industry && r.role_level === roleLevel
  )
  
  // Extract common structure
  const template = {
    sections: extractCommonSections(relevant),
    experienceBulletCount: getMedianBulletCount(relevant),
    skillCategories: extractSkillCategories(relevant),
    formatting: getMostCommonFormatting(relevant)
  }
  
  // Offer to user:
  // "Based on top-rated resumes in your field, here's a template..."
}
```

## Use Case 6: Contextual Help

Provide inline help based on what user is working on:

```javascript
const provideContextualHelp = async (currentSection, userInput) => {
  if (currentSection === 'experience' && userInput.includes('managed')) {
    // Search for better alternatives
    const examples = await searchResumes('leadership')
    
    // Suggest:
    // "Instead of 'managed', consider stronger verbs from top resumes:
    //  'led', 'directed', 'spearheaded', 'orchestrated'"
  }
  
  if (!hasMetrics(userInput)) {
    const metricsExamples = await searchResumes('metrics')
    
    // Show examples of how others quantified similar work
  }
}
```

## Use Case 7: Progressive Learning

Track which resume patterns work best:

```javascript
const trackSuccess = async (resumeId, outcome) => {
  // When user gets interview/job, mark which bank resumes influenced theirs
  await incrementReferenceCount(resumeId)
  
  // Over time, identify most influential patterns
  const stats = await getStats()
  
  // Use this to prioritize which examples to show
}
```

## Use Case 8: Skill-Specific Examples

When user mentions a skill, show how experts describe it:

```javascript
const handleSkillInput = async (skill) => {
  const bullets = await getExampleBullets(skill)
  
  // Display in sidebar or tooltip:
  // "How top resumes describe '${skill}':"
  // 
  // [Filterable list of bullets using that skill]
}
```

## Integration Example: Enhanced Stage1 Chatbot

```javascript
// In Stage1Chatbot.jsx

import { useResumeBank } from '../hooks/useResumeBank'

function Stage1Chatbot({ onResumeComplete }) {
  const { getBestPractices, getExampleBullets } = useResumeBank()
  const [bestPractices, setBestPractices] = useState(null)
  
  // Load best practices when component mounts
  useEffect(() => {
    const loadPractices = async () => {
      const practices = await getBestPractices()
      setBestPractices(practices)
    }
    loadPractices()
  }, [])
  
  // Enhance system prompt with best practices
  const getEnhancedSystemPrompt = () => {
    if (!bestPractices) return ORIGINAL_SYSTEM_PROMPT
    
    return `${ORIGINAL_SYSTEM_PROMPT}
    
    REFERENCE: Based on analysis of high-quality resumes:
    - ${bestPractices.features.slice(0, 10).join('\n    - ')}
    
    Use these patterns as inspiration when crafting bullets.`
  }
  
  // When user describes an achievement, show examples
  const handleUserMessage = async (message) => {
    // Extract key skills/topics from message
    const keywords = extractKeywords(message)
    
    // Get examples for context
    const examples = await getExampleBullets(keywords[0])
    
    // Show to user as helpful reference
    setInlineExamples(examples)
    
    // Continue conversation...
  }
}
```

## Analytics & Insights

Track resume bank usage to improve May:

```javascript
// Get statistics
const stats = await getStats()

// Insights:
// - Most referenced resumes → highlight these patterns
// - Most searched skills → create dedicated help for these
// - Gap analysis → what categories need more examples?
// - Quality trends → what makes a 5-star vs 3-star resume?
```

## Future Enhancements

1. **Automated Pattern Extraction**: ML analysis of bank resumes
2. **Dynamic Templates**: Generate custom templates on-the-fly
3. **A/B Testing**: Test which examples lead to best user outcomes
4. **Collaborative Filtering**: "Users with similar backgrounds used these resumes"
5. **Real-time Suggestions**: As user types, show relevant examples
6. **Visual Comparison**: Side-by-side comparison with bank examples

---

The Resume Bank transforms May from a simple chatbot into an intelligent assistant that learns from real, high-quality examples!
