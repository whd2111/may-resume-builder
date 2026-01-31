# Deployment Guide for May Resume Builder

## ⚠️ Important Security Note

The current implementation uses `dangerouslyAllowBrowser: true` in the Anthropic SDK, which exposes your API key in the browser. This is **ACCEPTABLE FOR PERSONAL USE** but **NOT for production deployment** where others will use the app.

## Option 1: Personal Use (Current Setup)

### Running Locally
```bash
npm install
npm run dev
```

Your app runs on `http://localhost:3000` - perfect for personal use!

### Building for Production (Personal)
```bash
npm run build
```

This creates an optimized build in the `dist/` folder. You can:
- Open `dist/index.html` directly in a browser
- Serve it with a simple HTTP server: `npx serve dist`
- Deploy to a static host (see Option 2)

## Option 2: Deploy for Public Use (Requires Backend)

If you want others to use your app, you need a backend to secure your API key.

### Architecture with Backend

```
Browser (React App) ←→ Your Backend ←→ Anthropic API
                      (holds API key)
```

### Quick Backend Setup (Node.js/Express)

1. **Create a backend folder:**
```bash
mkdir may-backend
cd may-backend
npm init -y
npm install express cors @anthropic-ai/sdk dotenv
```

2. **Create `server.js`:**
```javascript
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY // Stored securely on server
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, systemPrompt } = req.body;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages
    });

    res.json({ text: response.content[0].text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
```

3. **Create `.env` file:**
```
ANTHROPIC_API_KEY=your-api-key-here
```

4. **Update frontend `src/utils/claudeApi.js`:**
```javascript
export async function callClaude(apiKey, messages, systemPrompt) {
  // Note: apiKey parameter no longer used - it's on the backend
  const response = await fetch('http://localhost:3001/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, systemPrompt })
  });

  const data = await response.json();
  return data.text;
}
```

5. **Remove API key input:**
- Update `SetupScreen.jsx` to skip API key entry
- Remove localStorage API key logic
- Jump straight to Stage 1

## Option 3: Deploy to Vercel (Static + Serverless)

Vercel is perfect for this project - free tier, easy deployment, and supports serverless functions.

### Step 1: Prepare Your Project

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Create `api/chat.js` in your project root:**
```javascript
import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });

  const { messages, systemPrompt } = req.body;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages
    });

    res.json({ text: response.content[0].text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

3. **Update `src/utils/claudeApi.js`:**
```javascript
export async function callClaude(apiKey, messages, systemPrompt) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, systemPrompt })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.text;
}
```

### Step 2: Deploy

```bash
vercel
```

Follow the prompts:
- Set up and deploy: Yes
- Which scope: Your username
- Link to existing project: No
- Project name: may-resume-builder
- Directory: ./
- Override settings: No

### Step 3: Add Environment Variable

In Vercel dashboard:
1. Go to your project
2. Settings → Environment Variables
3. Add: `ANTHROPIC_API_KEY` with your API key
4. Redeploy: `vercel --prod`

Your app is now live at `https://may-resume-builder.vercel.app` (or similar)!

## Option 4: Deploy to Netlify

Similar to Vercel, with serverless functions support.

### Step 1: Prepare

1. **Create `netlify/functions/chat.js`:**
```javascript
const Anthropic = require('@anthropic-ai/sdk');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });

  const { messages, systemPrompt } = JSON.parse(event.body);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ text: response.content[0].text })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
```

2. **Create `netlify.toml`:**
```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

3. **Update API call in frontend:**
```javascript
export async function callClaude(apiKey, messages, systemPrompt) {
  const response = await fetch('/.netlify/functions/chat', {
    method: 'POST',
    body: JSON.stringify({ messages, systemPrompt })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.text;
}
```

### Step 2: Deploy

```bash
npm install -g netlify-cli
netlify init
netlify deploy --prod
```

Add `ANTHROPIC_API_KEY` in Netlify dashboard under Site settings → Environment variables.

## Option 5: Docker Deployment

For self-hosting or cloud deployment (AWS, DigitalOcean, etc.)

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy app
COPY . .

# Build
RUN npm run build

# Serve
RUN npm install -g serve
CMD ["serve", "-s", "dist", "-l", "3000"]

EXPOSE 3000
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  frontend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
```

### Deploy:
```bash
docker-compose up -d
```

## Cost Considerations

### API Usage Costs (Anthropic)
- Claude Sonnet 4: ~$3 per million input tokens, ~$15 per million output tokens
- Typical resume creation: ~10k tokens total = $0.10-0.30
- Typical resume tailoring: ~8k tokens total = $0.08-0.25

### Hosting Costs
- **Vercel/Netlify Free Tier**: 100GB bandwidth/month (sufficient for 1000s of users)
- **Personal use**: Essentially free
- **Light usage (<100 users/month)**: Free tier is plenty
- **Heavy usage**: ~$20-50/month for hosting + API costs

## Production Checklist

Before deploying publicly:

### Security
- [ ] Remove `dangerouslyAllowBrowser` from Claude API calls
- [ ] Implement backend API proxy
- [ ] Add rate limiting
- [ ] Validate all inputs
- [ ] Sanitize user data
- [ ] Add CORS restrictions
- [ ] Use HTTPS only

### User Experience
- [ ] Add loading skeletons
- [ ] Implement error boundaries
- [ ] Add retry logic for failed API calls
- [ ] Show API cost estimates
- [ ] Add "save draft" functionality
- [ ] Implement user accounts (optional)

### Legal/Compliance
- [ ] Add privacy policy
- [ ] Add terms of service
- [ ] Clarify AI-generated content
- [ ] Add disclaimer about resume accuracy
- [ ] GDPR compliance (if EU users)

### Analytics
- [ ] Add Google Analytics or similar
- [ ] Track conversion rates
- [ ] Monitor API costs
- [ ] Set up error logging (Sentry)

### Performance
- [ ] Optimize bundle size
- [ ] Add CDN for assets
- [ ] Implement caching
- [ ] Compress responses
- [ ] Add service worker for offline support

## Monitoring

### Key Metrics to Track
1. **API Success Rate**: How often Claude calls succeed
2. **Average Response Time**: How long users wait
3. **Resume Completion Rate**: % who finish Stage 1
4. **Tailoring Usage**: How many jobs per user
5. **Download Rate**: % who download the DOCX
6. **API Costs**: Track spending

### Recommended Tools
- **Error tracking**: Sentry
- **Analytics**: Google Analytics, Mixpanel
- **Uptime monitoring**: Pingdom, UptimeRobot
- **API monitoring**: Anthropic dashboard

## Support and Maintenance

### Updating Dependencies
```bash
npm update
npm audit fix
```

### Updating Claude Model
When new models release, update `src/utils/claudeApi.js`:
```javascript
model: 'claude-sonnet-4.5-20250514' // New version
```

### Backup Strategy
- localStorage data is browser-specific
- Consider adding export/import functionality
- Backend database for user accounts (future)

## Need Help?

### Common Issues

**"API key invalid" error:**
- Check environment variables are set
- Verify API key has credits
- Ensure key isn't exposed in frontend

**CORS errors:**
- Add proper CORS headers in backend
- Use proxy in development: `vite.config.js`

**Build fails:**
- Clear `node_modules` and reinstall
- Check Node.js version (requires 16+)
- Verify all dependencies are compatible

**DOCX formatting issues:**
- Test in Microsoft Word (most strict)
- Check docx.js version compatibility
- Validate page size settings

---

## Quick Deploy Commands

**Local development:**
```bash
npm run dev
```

**Build for production:**
```bash
npm run build
```

**Deploy to Vercel:**
```bash
vercel --prod
```

**Deploy to Netlify:**
```bash
netlify deploy --prod
```

**Docker:**
```bash
docker-compose up -d
```

---

Choose the deployment option that fits your needs:
- **Personal use**: Run locally
- **Share with friends**: Vercel/Netlify free tier
- **Public product**: Add backend + authentication + payments
