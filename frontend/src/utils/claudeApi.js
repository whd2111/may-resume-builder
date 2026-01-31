export async function callClaude(apiKey, messages, systemPrompt) {
  try {
    // Call our serverless function instead of Anthropic directly
    // This keeps the API key server-side and secure
    const response = await fetch('/api/claude', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages,
        systemPrompt: systemPrompt
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.content[0].text;
  } catch (error) {
    console.error('Claude API Error:', error);
    throw error;
  }
}
