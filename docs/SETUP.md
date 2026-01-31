# May Resume Builder - Setup Guide

## Local Development Setup

### 1. Clone the repository
```bash
git clone https://github.com/whd2111/may-resume-builder.git
cd may-resume-builder
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up your API key
1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Get your Anthropic API key:
   - Go to https://console.anthropic.com/settings/keys
   - Click "Create Key"
   - Copy the key

3. Add your key to `.env`:
   ```
   VITE_ANTHROPIC=sk-ant-api03-your-actual-key-here
   ```

### 4. Run the development server
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 5. Build for production
```bash
npm run build
```

## Deploying to Vercel

### Option 1: Connect GitHub (Recommended)
1. Go to https://vercel.com
2. Click "Add New Project"
3. Import `whd2111/may-resume-builder`
4. Add environment variable:
   - Key: `VITE_ANTHROPIC`
   - Value: Your Anthropic API key
5. Deploy

Now every push to `main` will auto-deploy!

### Option 2: Deploy via CLI
```bash
vercel --prod
```

You'll be prompted to add the environment variable during setup.

## Important Notes

- **Never commit `.env`** - it's in `.gitignore` for security
- **Never share API keys** in chat/public repos - they get auto-revoked
- Each team member should use their own API key for local development
- The `.env.example` file is a template - copy it but don't put real keys in it
- **API key security:** The app uses Vercel serverless functions (`/api/claude.js`) to keep the API key server-side and prevent exposure in browser network requests

## Troubleshooting

**"Invalid API key" error?**
- Check that your `.env` file exists and has the correct key
- Make sure the key starts with `sk-ant-api03-`
- Generate a fresh key if needed

**App not loading environment variables?**
- Restart your dev server after changing `.env`
- Make sure you're using `VITE_` prefix (required for Vite)
