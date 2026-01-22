# API Serverless Functions

This directory contains Vercel serverless functions that run server-side to keep sensitive credentials secure.

## Why Serverless Functions?

The app previously made direct API calls from the browser to Anthropic's API, which exposed the API key in browser network requests (visible in Chrome DevTools). Anyone could steal the key and rack up API charges.

By using Vercel serverless functions:
- API key stays server-side (in Vercel environment variables)
- Browser only calls our `/api/claude` endpoint
- No sensitive credentials exposed to users
- Much more secure architecture

## Files

### `claude.js`
Proxies requests to the Anthropic API. Takes `messages` and `systemPrompt` from the client, adds the API key server-side, and forwards to Anthropic.

**Usage:**
```javascript
// Client-side code
const response = await fetch('/api/claude', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Hello' }],
    systemPrompt: 'You are a helpful assistant'
  })
})
```

## Environment Variables

The serverless function needs `VITE_ANTHROPIC` set in Vercel:
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Add `VITE_ANTHROPIC` with your API key
3. Check all environments (Production, Preview, Development)
4. Redeploy

## Local Testing

To test serverless functions locally:
```bash
npm install -g vercel
vercel dev
```

This starts a local dev server that simulates Vercel's serverless environment.
