# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign in with GitHub
4. Click "New Project"
5. Fill in:
   - **Name**: `may-resume-builder`
   - **Database Password**: (generate a strong password, save it)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is perfect to start

Wait 2-3 minutes for project to initialize.

## Step 2: Run Database Migration

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste into the SQL editor
5. Click "Run" (or press Ctrl+Enter)

You should see: "Success. No rows returned"

## Step 3: Verify Tables Created

1. Go to **Table Editor** in sidebar
2. You should see these tables:
   - `resumes`
   - `stories`
   - `chat_sessions`
   - `user_preferences`

## Step 4: Get Your API Keys

1. Go to **Settings** → **API**
2. Copy these values:

   ```
   Project URL: https://xxxxx.supabase.co
   anon/public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

## Step 5: Add to Vercel Environment Variables

1. Go to your Vercel dashboard: [https://vercel.com](https://vercel.com)
2. Select your `may-resume-builder` project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

   | Name | Value | Environment |
   |------|-------|-------------|
   | `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` | Production, Preview, Development |
   | `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` (anon key) | Production, Preview, Development |
   | `SUPABASE_SERVICE_KEY` | `eyJhbGci...` (service_role key) | Production, Preview, Development |

5. Click "Save"

## Step 6: Add to Local Environment

1. Create `.env` file in project root (it's already in `.gitignore`)
2. Add:

   ```env
   # Existing
   VITE_ANTHROPIC=your-claude-key
   
   # New Supabase variables
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...
   SUPABASE_SERVICE_KEY=eyJhbGci...
   ```

## Step 7: Configure Email Auth (Optional)

By default, Supabase uses "magic link" email auth. To enable password-based auth:

1. Go to **Authentication** → **Providers**
2. Click **Email**
3. Toggle **Enable Email provider**: ON
4. Toggle **Confirm email**: OFF (for testing) or ON (for production)
5. Click "Save"

For production, you'll want to:
- Enable email confirmation
- Customize email templates (same page, scroll down)
- Set up custom SMTP (optional, otherwise uses Supabase's SMTP)

## Step 8: Test Database Connection

1. Run `npm install` in your project
2. Run `npm run dev`
3. Open `http://localhost:5173`
4. Open browser console
5. You should see no Supabase connection errors

## Step 9: Deploy to Vercel

After completing local setup:

```bash
git add .
git commit -m "Add Supabase backend with authentication"
git push origin main
```

Vercel will automatically deploy with your environment variables.

## Troubleshooting

### "Failed to fetch" errors
- Check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in `.env`
- Restart dev server after adding environment variables
- Verify project URL is correct (no trailing slash)

### "JWT expired" or "Invalid API key"
- Regenerate keys in Supabase dashboard
- Update in both Vercel and local `.env`
- Clear browser localStorage and try again

### RLS policies blocking queries
- Go to **Authentication** → **Policies** in Supabase
- Verify policies are enabled for each table
- Test queries in SQL editor with `SELECT auth.uid()`

### Email not sending
- Check **Authentication** → **Email Templates**
- For testing, disable email confirmation
- For production, set up custom SMTP in **Settings** → **Auth**

## Useful SQL Queries for Testing

```sql
-- View all users
SELECT * FROM auth.users;

-- View all resumes
SELECT id, title, is_master, created_at FROM resumes;

-- Count resumes per user
SELECT user_id, COUNT(*) FROM resumes GROUP BY user_id;

-- View all stories
SELECT id, title, company, times_used FROM stories;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename IN ('resumes', 'stories', 'chat_sessions', 'user_preferences');
```

## Next Steps

Once setup is complete:
1. ✅ Test sign-up flow
2. ✅ Test sign-in flow
3. ✅ Build a resume and verify it saves to database
4. ✅ Check Table Editor to see data
5. ✅ Test on production (Vercel deployment)

---

**Need help?** Check the [Supabase docs](https://supabase.com/docs) or [Discord community](https://discord.supabase.com)
