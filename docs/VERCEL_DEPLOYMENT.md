# Vercel Deployment Guide

## Project Structure

This monorepo contains:
- **Frontend**: React + Vite app in `frontend/`
- **API**: FastAPI backend in `api/`
- **Functions**: AWS Lambda page count service (separate deployment)

## Vercel Configuration

The root `vercel.json` is configured to:
1. Build the frontend from `frontend/` directory
2. Deploy FastAPI from `api/app/main.py`
3. Route `/api/*` requests to the FastAPI backend
4. Serve the frontend static files for all other routes

## Required Environment Variables in Vercel

Set these in your Vercel project settings (Settings → Environment Variables):

### Production Environment Variables

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON=your-production-anon-key

# API Configuration (leave empty to use relative paths)
VITE_API_URL=

# Page Count Lambda Function
VITE_PAGE_COUNT_URL=https://oihqxh6k6onolzgckmvkcguvgy0lqrvo.lambda-url.us-east-2.on.aws/

# Anthropic API Key (for backend)
ANTHROPIC_API_KEY=your-anthropic-api-key
```

### Notes:
- `VITE_API_URL` should be empty in production to use relative `/api` paths (handled by Vercel rewrites)
- All `VITE_*` variables are embedded at build time in the frontend
- `ANTHROPIC_API_KEY` is server-side only (used by FastAPI backend)

## Deployment Steps

1. **Connect Repository to Vercel**
   - Import your GitHub repository in Vercel dashboard
   - Vercel will auto-detect the configuration from `vercel.json`

2. **Set Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add all variables listed above
   - Set them for "Production" environment

3. **Deploy**
   - Push to your main branch, or
   - Click "Deploy" in Vercel dashboard

## Local Development

For local development, use the `.env` file in `frontend/`:

```bash
# frontend/.env (for local dev)
VITE_SUPABASE_URL=http://localhost:8000
VITE_SUPABASE_ANON=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY5OTc0MzM3LCJleHAiOjE5Mjc2NTQzMzd9.Td0_ALWtRChdzSdM4TvRLgYM0ZnqQI1jdilx1JYDmik
VITE_API_URL=http://localhost:8000
VITE_PAGE_COUNT_URL=/page-count
```

## Backend API Routes

The FastAPI backend exposes:
- `POST /api/claude` - Proxy to Anthropic API (keeps API key secure)

## Testing Production Build Locally

```bash
# Build frontend
cd frontend
npm run build
npm run preview

# Test API locally
cd api
uv run uvicorn app.main:app --reload
```

## Troubleshooting

### API requests fail in production
- Check that `VITE_API_URL` is empty (uses relative paths)
- Verify `ANTHROPIC_API_KEY` is set in Vercel environment variables
- Check Vercel function logs for errors

### Page count function fails
- Verify `VITE_PAGE_COUNT_URL` matches your Lambda function URL
- Ensure Lambda function is deployed and accessible

### Supabase connection fails
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON` are correct
- Check Supabase project is accessible from internet
- Verify RLS policies allow the operations you need
