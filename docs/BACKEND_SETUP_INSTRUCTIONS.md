# Backend Setup Instructions

## 🎯 What We've Built

We've added a complete backend with:
- **User Authentication** (sign-up, sign-in, sign-out)
- **Database Storage** (PostgreSQL via Supabase)
- **Resume Library** (save multiple versions)
- **Future: Story Library** (save and reuse experiences)

## 📋 Setup Checklist

### Step 1: Install Dependencies

```bash
npm install
```

This will install `@supabase/supabase-js` (already added to `package.json`).

### Step 2: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in with GitHub
3. Click "New Project"
4. Fill in:
   - **Name**: `may-resume-builder`
   - **Database Password**: (generate and save it)
   - **Region**: Choose closest to you
5. Wait 2-3 minutes for initialization

### Step 3: Run Database Migration

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Open `supabase/migrations/001_initial_schema.sql` in your project
4. Copy the entire file contents
5. Paste into Supabase SQL editor
6. Click "Run" (or Ctrl+Enter)

You should see: "Success. No rows returned"

Go to **Table Editor** to verify these tables were created:
- `resumes`
- `stories`
- `chat_sessions`
- `user_preferences`

### Step 4: Get API Keys

In Supabase dashboard:
1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGci...` (long string)
   - **service_role key**: `eyJhbGci...` (different long string)

### Step 5: Add Environment Variables

#### Local Development (.env file)

Create a `.env` file in the project root:

```env
# Claude AI API Key (existing)
VITE_ANTHROPIC=sk-ant-xxxxx

# Supabase Config (new)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_KEY=eyJhbGci...
```

#### Vercel (Production)

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your `may-resume-builder` project
3. Go to **Settings** → **Environment Variables**
4. Add these three new variables:

| Name | Value | Environment |
|------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` | Production, Preview, Development |
| `SUPABASE_SERVICE_KEY` | `eyJhbGci...` | Production, Preview, Development |

5. Click "Save"

### Step 6: Configure Supabase Auth

1. In Supabase, go to **Authentication** → **Providers**
2. Click **Email**
3. Settings:
   - **Enable Email provider**: ON
   - **Confirm email**: OFF (for testing) / ON (for production)
4. Click "Save"

For production, you may want to:
- Enable email confirmation
- Customize email templates
- Set up custom SMTP (optional)

### Step 7: Test Locally

```bash
npm run dev
```

Open `http://localhost:5173`:
1. You should see a "Sign In" button in the top right
2. Click it and try signing up with an email/password
3. If successful, you'll see your email in the user menu

### Step 8: Deploy to Vercel

```bash
git add .
git commit -m "Add Supabase backend with authentication"
git push origin main
```

Vercel will automatically deploy. Check the deployment logs for any errors.

### Step 9: Test Production

1. Visit your live site (e.g., `https://may-alpha.vercel.app`)
2. Sign up with a new account
3. Build a resume
4. Verify it saves (go to Supabase **Table Editor** → `resumes` to see the data)

## 🔍 What's Changed

### New Files Created

**Database & Auth:**
- `supabase/migrations/001_initial_schema.sql` - Database schema
- `src/lib/supabase.js` - Supabase client
- `src/contexts/AuthContext.jsx` - Auth state management
- `src/hooks/useResumes.js` - Resume CRUD operations
- `src/hooks/useStories.js` - Story CRUD operations (for future use)

**UI Components:**
- `src/components/auth/AuthModal.jsx` - Modal wrapper
- `src/components/auth/SignIn.jsx` - Sign in form
- `src/components/auth/SignUp.jsx` - Sign up form

**Documentation:**
- `BACKEND_ARCHITECTURE.md` - System design & schema
- `SUPABASE_SETUP.md` - Detailed Supabase guide
- `BACKEND_SETUP_INSTRUCTIONS.md` - This file

### Modified Files

- `package.json` - Added `@supabase/supabase-js`
- `src/main.jsx` - Wrapped app in `<AuthProvider>`
- `src/App.jsx` - Uses auth context & database instead of localStorage
- `src/components/Home.jsx` - Shows sign-in button & user menu
- `src/index.css` - Added auth modal & form styles

## 🧪 Troubleshooting

### "Failed to fetch" errors
- ✅ Check `.env` file has correct Supabase URL and keys
- ✅ Restart dev server after adding `.env` variables
- ✅ Verify no trailing slash in `VITE_SUPABASE_URL`

### Can't sign up
- ✅ Check Supabase **Authentication** → **Providers** → Email is enabled
- ✅ Look at browser console for error messages
- ✅ Check Supabase **Authentication** → **Users** to see if account was created

### Resume not saving
- ✅ Check Supabase **Table Editor** → `resumes` to see if data appears
- ✅ Verify RLS policies are enabled (they should be from migration)
- ✅ Check browser console for errors

### Vercel deployment fails
- ✅ Verify all environment variables are set in Vercel dashboard
- ✅ Check build logs for missing dependencies
- ✅ Make sure `npm install` runs successfully locally

## 🎓 How It Works

### Before (localStorage)
```
User → React App → localStorage (browser-only)
```
- Data only exists in one browser
- Clearing cache = lose everything
- No multi-device sync

### After (Supabase)
```
User → React App → Supabase (PostgreSQL database)
```
- Data persists in cloud database
- Access from any device
- Multi-user ready
- Automatic backups

### Authentication Flow

1. **Sign Up**: User creates account → Supabase stores in `auth.users` table → Creates entry in `user_preferences`
2. **Sign In**: User logs in → Supabase returns JWT token → Stored in browser
3. **Access Data**: API calls include JWT → Supabase validates → RLS policies enforce user can only see their own data
4. **Sign Out**: Clear JWT → User logged out

### Resume Storage

**Old way:**
```javascript
localStorage.setItem('may_master_resume', JSON.stringify(resume))
```

**New way:**
```javascript
await createResume('Master Resume', resumeData, true)
// Saved to Supabase `resumes` table
```

## 📊 Database Schema Overview

### `resumes` table
- `id` - Unique identifier
- `user_id` - Links to authenticated user
- `title` - "Master Resume", "Google PM Application", etc.
- `is_master` - Boolean (only one per user)
- `resume_data` - Full JSON structure (same format as before)
- `tailored_for` - Job description (if tailored)
- `created_at`, `updated_at` - Timestamps

### `stories` table (for future use)
- Save individual experiences/achievements
- Reuse across multiple resumes
- Track which stories are most effective

## 🚀 Next Steps (Optional)

Want to go further? Here are ideas:

1. **Resume Library UI**: Add a page to view all saved resumes
2. **Story Library**: Implement the story extraction and reuse feature
3. **Export History**: Track all downloads
4. **Resume Comparison**: Compare different versions side-by-side
5. **Sharing**: Generate shareable links to resumes
6. **Templates**: Save custom formatting preferences

## 💰 Cost Analysis

### Supabase Free Tier
- 50,000 monthly active users
- 500 MB database space
- Perfect for personal use + sharing with friends

### Estimated Usage
- ~1.65 MB per user (5 resumes, 20 stories, 10 chat sessions)
- Free tier supports ~300 active users
- Paid tier ($25/mo): Supports ~4,800 users

## 📞 Need Help?

If you run into issues:

1. Check browser console (F12) for error messages
2. Check Supabase **Table Editor** to see if data is saving
3. Check Vercel deployment logs for build errors
4. Review `SUPABASE_SETUP.md` for detailed Supabase instructions
5. Check Supabase docs: https://supabase.com/docs

## ✅ Quick Test Checklist

After setup, test these flows:

- [ ] Sign up with new email
- [ ] Sign in with that email
- [ ] Build a resume (should save automatically)
- [ ] Sign out and sign back in (resume should still be there)
- [ ] Check Supabase Table Editor (data should appear in `resumes` table)
- [ ] Deploy to Vercel (no build errors)
- [ ] Test on production URL (sign up, build resume)

---

**Built with Claude Sonnet 4.5** 🤖
