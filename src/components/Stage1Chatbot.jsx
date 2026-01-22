import { useState, useRef, useEffect } from 'react'
import { callClaude } from '../utils/claudeApi'
import { generateDOCX } from '../utils/docxGenerator'
import MetricPrompter from './MetricPrompter'
import { ArrowLeftIcon, SendIcon, WritingIcon, DownloadIcon } from '../utils/icons'
import { getMayKnowledge, buildEnhancedPrompt } from '../utils/patternQueries'

// ... existing prompts ...

const SYSTEM_PROMPT = `You are May, an expert resume builder assistant. Your job is to have a natural conversation with the user to gather information for their primary 1-page resume.

CRITICAL: Track what information you've already collected. Do NOT ask for information the user has already provided.

RESUME WRITING RULES:
- Use action verbs (led, built, drove, managed, designed, etc.)
- **PAST TENSE REQUIRED**: All bullets for completed/past positions MUST use past tense. Only current positions use present tense.
- **NO PLACEHOLDERS**: NEVER output placeholder text like [ADD NUMBER], [ADD %], [ADD OUTCOME], etc. If you don't have a metric, either ask for it OR write the bullet without it. NEVER use brackets with placeholders.
- Keep bullets concise - MAX 2 lines each, but aim to fill the line (don't make them too short)
- Use metrics and quantify impact whenever possible
- Follow "did X by Y as shown by Z" framework when applicable
- Be specific about the user's individual contributions, not team accomplishments

CONVERSATION FLOW:
1. Start by asking about their basic info (name, email, phone, LinkedIn if they have it)
2. Ask about their education (degrees, institutions, dates, honors)
3. Ask about their work experience chronologically (recent first):
   - Company name, title, dates
   - For each role, ask: "What were your main responsibilities and achievements?"
   - CRITICAL: Ask follow-up questions to extract their INDIVIDUAL contributions:
     * "What exactly was YOUR role on that project?"
     * "What metrics best capture the impact YOU had?"
     * "How did YOU specifically contribute to that outcome?"
   - Dig deeper until you have concrete, quantifiable achievements
4. Ask about technical skills, certifications, or additional relevant info

IMPORTANT GUIDELINES:
- Ask ONE question at a time for a natural conversation
- Keep track of what you've already learned - NEVER ask for the same information twice
- When the user mentions an achievement, probe for metrics and their specific contribution
- If they say "we did X", ask "What was YOUR specific role in achieving X?"
- Keep the conversation friendly and encouraging
- After gathering sufficient info for a strong resume, let them know you'll generate it
- DO NOT generate the resume until you have enough detail for compelling bullet points
- **NEVER INCLUDE PLACEHOLDER BRACKETS** - If missing data, ask for it or omit it, but don't use [ADD X] notation

When you're ready to generate the resume, respond with a JSON object in this EXACT format:
{
  "action": "generate_resume",
  "data": {
    "name": "Full Name",
    "contact": {
      "phone": "123-456-7890",
      "email": "email@example.com",
      "linkedin": "linkedin.com/in/username" (optional)
    },
    "education": [
      {
        "institution": "University Name",
        "degree": "Degree Name",
        "location": "City, ST",
        "dates": "YYYY - YYYY",
        "details": "Honors, GPA, etc." (optional)
      }
    ],
    "experience": [
      {
        "company": "Company Name",
        "title": "Job Title",
        "location": "City, ST",
        "dates": "YYYY - YYYY",
        "bullets": [
          "PAST TENSE action verb + what they did + metrics/impact (1-2 lines, NO PLACEHOLDERS)",
          "Another achievement with quantifiable results (PAST TENSE, NO PLACEHOLDERS)"
        ]
      }
    ],
    "skills": "Python, SQL, JavaScript, etc." (optional),
    "additional": "Any other relevant information" (optional)
  }
}

CRITICAL REMINDERS:
- All experience bullets MUST use past tense (led, built, drove, managed) unless it's a current position
- NEVER use placeholder text like [ADD NUMBER], [ADD %], [ADD OUTCOME] - write complete sentences only
- Bullets should be 1-2 full lines to avoid excessive white space

Continue the conversation naturally until you have enough information to create a compelling resume.`;

const REVIEWER_SYSTEM_PROMPT = `You are an expert resume reviewer who gives constructive, actionable feedback. Your tone should be encouraging yet direct - point out what needs work while celebrating what's strong.

EVALUATION CRITERIA:
- **PLACEHOLDERS**: CRITICAL - Check for any placeholder text like [ADD NUMBER], [ADD %], [ADD OUTCOME], [ADD SCOPE]. These MUST be filled in.
- **LENGTH**: CRITICAL - Resume MUST fit on ONE PAGE. Count total lines/content and flag if it exceeds 1 page.
- **TENSE**: CRITICAL - All bullets for past positions MUST use past tense (led, built, drove). Current positions use present tense. Flag any inconsistencies.
- **LINE FILLING**: Check if bullets are too short and leave excessive white space. Bullets should fill 1-2 lines properly.
- **ACTION VERBS**: Strong, specific action verbs
- **METRICS**: Quantifiable results and impact
- **CONCISENESS**: Max 2 lines per bullet, clear writing
- **IMPACT**: "did X by Y as shown by Z" framework
- **CLARITY**: No vague statements

OUTPUT FORMAT:
## Overall Score: X/10

## ⚠️ CRITICAL ISSUES (if any):
[MUST flag these if found:
 - Any placeholder text like [ADD NUMBER] or similar
 - Resume exceeding 1 page
 - Tense inconsistencies (mixing past/present for completed work)
 - Other critical issues]

## 🎯 Quick Wins (2-3 easiest improvements):
[List 2-3 simple, high-impact changes that take <5 minutes to fix. Be specific.]
Example: "Replace [ADD NUMBER] with actual metric" or "Change 'manage' to 'managed' for consistency"

## 💪 Strongest Points (2-3):
[Highlight what's working really well. Be specific about why these elements are strong.]

## 🔧 Key Improvements Needed:
[List 2-3 most important changes with specific before/after examples. Show exact rewrites.]

## 📝 Next Steps:
[Give a clear, prioritized action plan. What should they tackle first, second, third?]

TONE GUIDELINES:
- Be direct but encouraging
- Provide specific examples and rewrites (not just "this is too long")
- Celebrate strong content while improving weak areas
- Focus on actionable next steps
- Avoid harsh words like "chaos" or "terrible" - use "needs improvement" or "could be stronger"`;

function formatResumeForReview(resume) {
  let text = `NAME: ${resume.name}\n\n`
  text += `CONTACT:\nPhone: ${resume.contact.phone}\nEmail: ${resume.contact.email}\n`
  if (resume.contact.linkedin) text += `LinkedIn: ${resume.contact.linkedin}\n`
  text += `\n`

  if (resume.education && resume.education.length > 0) {
    text += `EDUCATION:\n`
    resume.education.forEach(edu => {
      text += `${edu.degree} - ${edu.institution}, ${edu.location} (${edu.dates})\n`
      if (edu.details) text += `${edu.details}\n`
    })
    text += `\n`
  }

  if (resume.experience && resume.experience.length > 0) {
    text += `EXPERIENCE:\n`
    resume.experience.forEach(exp => {
      text += `\n${exp.title} - ${exp.company}, ${exp.location} (${exp.dates})\n`
      exp.bullets.forEach(bullet => {
        text += `• ${bullet}\n`
      })
    })
    text += `\n`
  }

  if (resume.skills) text += `SKILLS:\n${resume.skills}\n\n`
  if (resume.additional) text += `ADDITIONAL:\n${resume.additional}\n`

  return text
}

function Stage1Chatbot({ onResumeComplete, onBack, existingResume }) {
  const getInitialMessage = () => {
    if (existingResume) {
      return "Welcome back! I can help you refine your existing resume or we can start fresh. What would you like to do?"
    }
    return "Hi! I'm May, and I'm here to help you build an amazing resume. Let's start with the basics - what's your full name?"
  }

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: getInitialMessage()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showMetricPrompter, setShowMetricPrompter] = useState(false)
  const [isReviewing, setIsReviewing] = useState(false)
  const [review, setReview] = useState(null)
  const [generatedResumeData, setGeneratedResumeData] = useState(null)
  const chatEndRef = useRef(null)
  
  // Pattern system integration
  const [learnedPatterns, setLearnedPatterns] = useState(null)
  const [userContext, setUserContext] = useState({
    industry: null,
    role_level: null,
    job_function: null
  })
  const [enhancedPrompt, setEnhancedPrompt] = useState(SYSTEM_PROMPT)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load learned patterns when user context changes
  useEffect(() => {
    async function loadPatterns() {
      if (userContext.industry || userContext.job_function) {
        try {
          const knowledge = await getMayKnowledge(userContext)
          setLearnedPatterns(knowledge)
          
          // Enhance the system prompt with learned patterns
          const enhanced = buildEnhancedPrompt(SYSTEM_PROMPT, knowledge)
          setEnhancedPrompt(enhanced)
          
          console.log('✅ Loaded patterns for:', userContext)
        } catch (error) {
          console.error('Error loading patterns:', error)
          // Fallback to base prompt if pattern loading fails
          setEnhancedPrompt(SYSTEM_PROMPT)
        }
      }
    }
    
    loadPatterns()
  }, [userContext])

  // Detect user context from conversation
  useEffect(() => {
    const detectContext = () => {
      const conversationText = messages.map(m => m.content).join(' ').toLowerCase()
      
      // Detect industry
      const industries = ['tech', 'finance', 'consulting', 'healthcare', 'marketing']
      const detectedIndustry = industries.find(ind => conversationText.includes(ind))
      
      // Detect role level
      let roleLevel = null
      if (conversationText.includes('senior') || conversationText.includes('lead')) {
        roleLevel = 'senior'
      } else if (conversationText.includes('junior') || conversationText.includes('entry')) {
        roleLevel = 'entry'
      } else if (conversationText.includes('mid-level') || conversationText.includes('associate')) {
        roleLevel = 'mid'
      }
      
      // Detect job function
      const functions = ['engineering', 'product', 'marketing', 'sales', 'operations']
      const detectedFunction = functions.find(func => conversationText.includes(func))
      
      // Update context if we detected something new
      if (detectedIndustry && detectedIndustry !== userContext.industry) {
        setUserContext(prev => ({ ...prev, industry: detectedIndustry }))
      }
      if (roleLevel && roleLevel !== userContext.role_level) {
        setUserContext(prev => ({ ...prev, role_level: roleLevel }))
      }
      if (detectedFunction && detectedFunction !== userContext.job_function) {
        setUserContext(prev => ({ ...prev, job_function: detectedFunction }))
      }
    }
    
    if (messages.length > 2) {
      detectContext()
    }
  }, [messages])

  const startReview = async (resumeData) => {
    setIsReviewing(true)

    try {
      // Get AI review
      const reviewPrompt = formatResumeForReview(resumeData)
      const reviewResponse = await callClaude(
        null,
        [{ role: 'user', content: `Please review this resume and provide detailed feedback:\n\n${reviewPrompt}` }],
        REVIEWER_SYSTEM_PROMPT
      )

      setReview(reviewResponse)
    } catch (error) {
      console.error('Error getting review:', error)
      setReview('Error getting review. Please try again.')
    } finally {
      setIsReviewing(false)
    }
  }

  const handleMetricsComplete = async (updatedResumeData) => {
    // Update the stored resume data
    setGeneratedResumeData(updatedResumeData)
    setShowMetricPrompter(false)

    // Regenerate DOCX with the updated metrics
    await generateDOCX(updatedResumeData)

    // Now show the review
    startReview(updatedResumeData)
  }

  const handleSkipMetrics = () => {
    setShowMetricPrompter(false)
    // Use the original resume data without metrics
    startReview(generatedResumeData)
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    
    // Add user message to UI
    const newMessages = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)
    setIsLoading(true)

    try {
      // Build conversation history for Claude (all messages except the initial system one)
      const conversationHistory = newMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      // Use enhanced prompt with learned patterns
      const response = await callClaude(null, conversationHistory, enhancedPrompt)

      // Check if Claude wants to generate the resume
      if (response.includes('"action": "generate_resume"')) {
        try {
          // Extract JSON from response
          const jsonMatch = response.match(/\{[\s\S]*"action":\s*"generate_resume"[\s\S]*\}/)
          if (jsonMatch) {
            const resumeData = JSON.parse(jsonMatch[0])

            setMessages(prev => [...prev, {
              role: 'assistant',
              content: "Perfect! I have all the information I need. Let me generate your primary 1-page resume..."
            }])

            setIsGenerating(true)

            // Generate DOCX
            await generateDOCX(resumeData.data)

            // Save resume data
            setGeneratedResumeData(resumeData.data)
            setIsGenerating(false)

            // Check if resume has [ADD METRIC] placeholders
            const hasMetrics = JSON.stringify(resumeData.data).includes('[ADD METRIC]')

            if (hasMetrics) {
              // Show metric prompter to fill in missing metrics
              setShowMetricPrompter(true)
            } else {
              // No metrics to add, go straight to review
              startReview(resumeData.data)
            }
          }
        } catch (error) {
          console.error('Error parsing resume data:', error)
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: response
          }])
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: response }])
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error.message}. Please check your API key and try again.`
      }])
    } finally {
      setIsLoading(false)
    }
  }

  // Show metric prompter if needed
  if (showMetricPrompter && generatedResumeData) {
    return (
      <MetricPrompter
        resumeData={generatedResumeData}
        onComplete={handleMetricsComplete}
        onSkip={handleSkipMetrics}
      />
    )
  }

  if (isGenerating) {
    return (
      <div className="container">
        <div className="page-header">
          <h1 className="logo">May</h1>
          <p className="tagline">Generating Your Resume...</p>
        </div>
        <div style={{ textAlign: 'center', padding: 'var(--space-3xl) var(--space-xl)' }}>
          <div className="action-card-icon" style={{ margin: '0 auto var(--space-xl)', background: 'var(--gradient-primary)', color: 'white' }}>
            <WritingIcon />
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '20px', fontWeight: '500' }}>
            Creating your professional resume document...
          </p>
          <div className="loading" style={{ marginTop: 'var(--space-lg)' }}></div>
        </div>
      </div>
    )
  }

  if (isReviewing) {
    return (
      <div className="container">
        <div className="page-header">
          <h1 className="logo">May</h1>
          <p className="tagline">Reviewing Your Resume...</p>
        </div>
        <div style={{ textAlign: 'center', padding: 'var(--space-3xl) var(--space-xl)' }}>
          <div className="action-card-icon" style={{ margin: '0 auto var(--space-xl)', background: 'var(--gradient-primary)', color: 'white' }}>
            <WritingIcon />
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '20px', fontWeight: '500' }}>
            Analyzing your resume quality...
          </p>
          <div className="loading" style={{ marginTop: 'var(--space-lg)' }}></div>
        </div>
      </div>
    )
  }

  if (review && generatedResumeData) {
    return (
      <div className="container" style={{ maxWidth: '900px' }}>
        <div className="page-header">
          <h1 className="page-title">Resume Created! 🎉</h1>
          <p className="page-subtitle">Your resume has been downloaded. Here's May's feedback:</p>
        </div>

        <div className="card-premium">
          <div className="card-title">
            <WritingIcon />
            AI Review Feedback
          </div>
          <div style={{
            whiteSpace: 'pre-wrap',
            lineHeight: '1.8',
            color: 'var(--text-primary)',
            fontSize: '16px',
            marginBottom: 'var(--space-xl)'
          }}>
            {review}
          </div>

          <div className="button-group">
            <button
              className="btn btn-primary"
              onClick={() => {
                onResumeComplete(generatedResumeData)
              }}
            >
              Done & Return Home
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => generateDOCX(generatedResumeData)}
            >
              <DownloadIcon />
              Download Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: '900px' }}>
      <nav className="nav-bar">
        {onBack && (
          <button className="back-button" onClick={onBack}>
            <ArrowLeftIcon />
            Back
          </button>
        )}
        <div className="logo" style={{ fontSize: '24px', margin: 0 }}>May</div>
      </nav>

      <div className="page-header">
        <h1 className="page-title">Build a Resume</h1>
        <p className="page-subtitle">Chat with May to create your professional resume</p>
      </div>

      <div className="chat-container">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <div className="message-content">
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message assistant">
            <div className="message-content">
              <div className="loading"></div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleSendMessage} style={{ marginTop: 'var(--space-lg)' }}>
        <div className="input-wrapper">
          <input
            type="text"
            className="input-field"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your response..."
            disabled={isLoading}
          />
          <button type="submit" className="btn btn-primary" disabled={isLoading || !input.trim()}>
            <SendIcon />
          </button>
        </div>
      </form>
    </div>
  )
}

export default Stage1Chatbot
