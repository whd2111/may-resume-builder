import { useState, useRef, useEffect } from 'react'
import { callClaude } from '../utils/claudeApi'
import { generateDOCX } from '../utils/docxGenerator'

const SYSTEM_PROMPT = `You are May, an expert resume builder assistant. Your job is to have a natural conversation with the user to gather information for their master resume.

CRITICAL: Track what information you've already collected. Do NOT ask for information the user has already provided.

RESUME WRITING RULES:
- Use action verbs (led, built, drove, managed, designed, etc.)
- Keep bullets concise - MAX 2 lines each
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
          "Action verb + what they did + metrics/impact (max 2 lines)",
          "Another achievement with quantifiable results"
        ]
      }
    ],
    "skills": "Python, SQL, JavaScript, etc." (optional),
    "additional": "Any other relevant information" (optional)
  }
}

Continue the conversation naturally until you have enough information to create a compelling resume.`;

function Stage1Chatbot({ apiKey, onResumeComplete, onBack, existingResume }) {
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
  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

      const response = await callClaude(apiKey, conversationHistory, SYSTEM_PROMPT)

      // Check if Claude wants to generate the resume
      if (response.includes('"action": "generate_resume"')) {
        try {
          // Extract JSON from response
          const jsonMatch = response.match(/\{[\s\S]*"action":\s*"generate_resume"[\s\S]*\}/)
          if (jsonMatch) {
            const resumeData = JSON.parse(jsonMatch[0])

            setMessages(prev => [...prev, {
              role: 'assistant',
              content: "Perfect! I have all the information I need. Let me generate your master resume..."
            }])

            setIsGenerating(true)

            // Generate DOCX
            await generateDOCX(resumeData.data)

            // Save resume data and move to next stage
            onResumeComplete(resumeData.data)
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

  if (isGenerating) {
    return (
      <div className="container">
        <div className="header">
          <div className="logo">May</div>
          <p className="tagline">Generating Your Resume...</p>
        </div>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="loading" style={{ width: '60px', height: '60px', margin: '0 auto 20px' }}></div>
          <p style={{ color: '#666', fontSize: '18px' }}>
            Creating your professional resume document...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: '900px' }}>
      <div className="page-header">
        {onBack && (
          <button className="back-button" onClick={onBack}>
            ← Back to Home
          </button>
        )}
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
              <div className="loading-spinner"></div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleSendMessage}>
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
            Send
          </button>
        </div>
      </form>
    </div>
  )
}

export default Stage1Chatbot
