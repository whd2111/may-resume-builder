# May Resume Builder - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         User Browser                         │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    React Application                    │ │
│  │                                                          │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │ │
│  │  │ SetupScreen  │  │    Stage1    │  │    Stage2    │ │ │
│  │  │              │→ │   Chatbot    │→ │   Tailor     │ │ │
│  │  │  API Key     │  │              │  │              │ │ │
│  │  │   Entry      │  │  Conversational  │  Job-Specific │ │ │
│  │  └──────────────┘  │  Resume Builder│  │  Tailoring   │ │ │
│  │                    └────────┬───────┘  └──────┬───────┘ │ │
│  │                             │                  │         │ │
│  │                    ┌────────▼──────────────────▼───────┐ │ │
│  │                    │      claudeApi.js                 │ │ │
│  │                    │  (Anthropic SDK Integration)      │ │ │
│  │                    └───────────────┬───────────────────┘ │ │
│  │                                    │                      │ │
│  │                    ┌───────────────▼───────────────────┐ │ │
│  │                    │     docxGenerator.js              │ │ │
│  │                    │  (Resume → DOCX Conversion)       │ │ │
│  │                    └───────────────────────────────────┘ │ │
│  │                                                          │ │
│  │  ┌─────────────────────────────────────────────────────┐│ │
│  │  │            localStorage (Browser)                   ││ │
│  │  │  • API Key (may_api_key)                           ││ │
│  │  │  • Master Resume (may_master_resume)               ││ │
│  │  └─────────────────────────────────────────────────────┘│ │
│  └──────────────────────────────────────────────────────────┘ │
└───────────────────────────────────┬───────────────────────────┘
                                    │
                                    │ HTTPS
                                    ▼
                        ┌───────────────────────┐
                        │  Anthropic Claude API │
                        │   (api.anthropic.com) │
                        └───────────────────────┘
```

## Component Flow

### Stage 1: Master Resume Creation

```
User Opens App
     │
     ▼
SetupScreen
     │ (enters API key)
     ▼
Stage1Chatbot ←──────────────┐
     │                        │
     │ (user responds)        │
     ▼                        │
claudeApi.callClaude()        │
     │                        │
     │ (sends message)        │
     ▼                        │
Anthropic API                 │
     │                        │
     │ (returns response)     │
     ▼                        │
Parse Response                │
     │                        │
     ├─ Regular message? ─────┘
     │  (continue conversation)
     │
     └─ Generate resume?
            │
            ▼
     docxGenerator.generateDOCX()
            │
            ▼
     Save to localStorage
            │
            ▼
     Navigate to Stage2
```

### Stage 2: Job-Specific Tailoring

```
Stage2Tailor
     │
     │ (user pastes job description)
     ▼
Load Master Resume
     │ (from localStorage)
     ▼
claudeApi.callClaude()
     │ (sends master resume + job description)
     ▼
Anthropic API
     │ (analyzes and tailors)
     ▼
Parse Tailored Resume JSON
     │
     ├─────────────────┬──────────────┐
     │                 │              │
     ▼                 ▼              ▼
Show Preview    Show Explanation  Enable Download
     │                                │
     │                                ▼
     │                    docxGenerator.generateDOCX()
     │                                │
     │                                ▼
     │                        Browser Downloads File
     │
     └────► User can tailor for another job
```

## Data Flow

### Resume Data Structure

```javascript
{
  name: "Full Name",
  contact: {
    phone: "xxx-xxx-xxxx",
    email: "email@example.com",
    linkedin: "linkedin.com/in/username" // optional
  },
  education: [
    {
      institution: "University Name",
      degree: "Degree Name",
      location: "City, ST",
      dates: "YYYY - YYYY",
      details: "Honors, GPA, etc." // optional
    }
  ],
  experience: [
    {
      company: "Company Name",
      title: "Job Title",
      location: "City, ST",
      dates: "YYYY - YYYY",
      bullets: [
        "Action verb + achievement + metrics (max 2 lines)",
        "Another accomplishment with quantifiable results"
      ]
    }
  ],
  skills: "Comma-separated list", // optional
  additional: "Any other info" // optional
}
```

### State Management

```
App Component (Top Level)
  │
  ├─ apiKey: string
  ├─ stage: 'setup' | 'stage1' | 'stage2'
  └─ masterResume: ResumeData | null
       │
       └─ Synced to localStorage on changes
```

## AI Prompt Engineering

### Stage 1 System Prompt (Simplified)

```
You are May, an expert resume builder.

RULES:
- Use action verbs
- Max 2 lines per bullet
- Use metrics and "did X by Y as shown by Z" framework
- Extract individual contributions

FLOW:
1. Ask about basic info
2. Ask about education
3. For each job:
   - Get company, title, dates
   - Ask about achievements
   - PROBE for metrics: "What was YOUR specific role?"
   - PROBE for impact: "What metrics capture this?"
4. Ask about skills

When ready, generate JSON with resume data.
```

### Stage 2 System Prompt (Simplified)

```
You are May, a resume tailoring expert.

Given:
- Master resume (all experience)
- Job description (requirements, skills)

Task:
- Analyze job requirements
- Rewrite bullets to emphasize relevant experience
- Use keywords from job description
- NEVER fabricate - only reframe existing accomplishments
- Maintain 2-line max, action verbs, metrics

Return JSON with tailored resume + explanation of changes.
```

## Security Considerations

### Current Implementation (Prototype)
- ✅ API key stored in localStorage (browser only)
- ✅ No server = no data breaches
- ✅ All processing client-side
- ⚠️ API key exposed to browser (uses dangerouslyAllowBrowser)

### Production Recommendations
```
User Browser                    Your Backend               Anthropic API
     │                               │                          │
     │  1. Resume data              │                          │
     │  ───────────────────────────►│                          │
     │                               │                          │
     │                               │  2. API call with        │
     │                               │     your secure key      │
     │                               │  ───────────────────────►│
     │                               │                          │
     │                               │  3. AI response          │
     │                               │  ◄───────────────────────│
     │                               │                          │
     │  4. Tailored resume           │                          │
     │  ◄───────────────────────────│                          │
     │                               │                          │
```

Benefits:
- ✅ API key never exposed to browser
- ✅ Rate limiting and usage tracking
- ✅ User authentication
- ✅ Store multiple resume versions
- ✅ Usage analytics

## File Organization

### Source Files by Purpose

**Entry Point:**
- `index.html` - HTML shell
- `src/main.jsx` - React bootstrap
- `src/App.jsx` - Main app logic & routing

**UI Components:**
- `src/components/SetupScreen.jsx` - API key input
- `src/components/Stage1Chatbot.jsx` - Conversation interface
- `src/components/Stage2Tailor.jsx` - Job tailoring interface

**Business Logic:**
- `src/utils/claudeApi.js` - AI API calls
- `src/utils/docxGenerator.js` - Document creation

**Styling:**
- `src/index.css` - Base styles
- `src/App.css` - Component styles

**Configuration:**
- `package.json` - Dependencies
- `vite.config.js` - Build config
- `.gitignore` - Git exclusions

**Documentation:**
- `README.md` - Full documentation
- `QUICKSTART.md` - Quick setup guide
- `ARCHITECTURE.md` - This file
- `PROJECT_SUMMARY.md` - Overview
- `EXAMPLE_DATA.json` - Sample data

## Technology Decisions

### Why React?
- Component-based architecture
- Easy state management with hooks
- Rich ecosystem
- Fast development

### Why Vite?
- Lightning-fast HMR (Hot Module Replacement)
- Modern build tool
- Better than Create React App
- Optimized production builds

### Why Claude API?
- Best-in-class reasoning
- Excellent at structured output (JSON)
- Strong prompt following
- Great at creative rewriting

### Why docx.js?
- Pure JavaScript (no external dependencies)
- Precise control over formatting
- Industry standard .docx output
- Works in browser

### Why localStorage?
- No backend needed
- Instant persistence
- Survives page refreshes
- Simple API

## Performance Considerations

### API Latency
- Stage 1 conversation: ~2-4 seconds per response
- Stage 2 tailoring: ~4-8 seconds (more analysis)

### Optimization Strategies
- Show loading states immediately
- Optimistic UI updates where possible
- Cache master resume locally
- Minimal re-renders with proper React hooks

### Bundle Size
- React: ~140KB
- Anthropic SDK: ~300KB
- docx.js: ~200KB
- Total: ~650KB (reasonable for modern web app)

## Error Handling

### API Errors
- Invalid API key → Clear error message
- Rate limiting → Suggest waiting
- Network issues → Retry prompt

### Data Validation
- Required fields checked before API call
- JSON parsing with try/catch
- Graceful fallbacks

### User Experience
- Loading states prevent double-clicks
- Disabled buttons during processing
- Error messages in user-friendly language

## Testing Recommendations

### Manual Testing Checklist
1. ✅ Enter invalid API key → error shown
2. ✅ Enter valid API key → proceeds to Stage 1
3. ✅ Complete full conversation → resume generates
4. ✅ Resume saves to localStorage → persists on refresh
5. ✅ Tailor resume → formatted properly
6. ✅ Download DOCX → opens in Word correctly
7. ✅ Start over → clears all data
8. ✅ Edit master → returns to Stage 1 with data

### Automated Testing (Future)
- Unit tests for utility functions
- Integration tests for components
- E2E tests for full flow
- API mocking for consistent tests

---

This architecture is designed for:
- **Simplicity** - Easy to understand and modify
- **Modularity** - Components are independent
- **Scalability** - Can add features without major refactor
- **User Experience** - Fast, intuitive, reliable
