// Vercel serverless function to proxy Anthropic API calls
// This keeps the API key server-side and prevents exposure in browser

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Get API key from server-side environment variable
  const apiKey = process.env.VITE_ANTHROPIC_API

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' })
  }

  try {
    const { messages, systemPrompt } = req.body

    // Validate request body
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request: messages array required' })
    }

    // Call Anthropic API from server-side
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt || '',
        messages: messages
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      return res.status(response.status).json({
        error: 'Anthropic API error',
        details: errorData
      })
    }

    const data = await response.json()

    // Return the response from Anthropic
    return res.status(200).json(data)

  } catch (error) {
    console.error('Error calling Anthropic API:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
}
