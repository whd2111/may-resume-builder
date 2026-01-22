# May Resume Builder - Backend Architecture

## Overview

Transform May from a localStorage-based tool into a full-stack application with user authentication and persistent cloud storage.

## Technology Stack

**Backend:**
- **Supabase**: PostgreSQL database + built-in authentication
- **Vercel Serverless Functions**: API routes (already set up)

**Why Supabase?**
- Built-in authentication (email/password, OAuth)
- PostgreSQL with real-time subscriptions
- Row-level security (RLS) for data privacy
- Generous free tier (50,000 monthly active users)
- Easy integration with Vercel
- No backend code needed for auth

## Database Schema

### `users` table (managed by Supabase Auth)
```sql
-- Auto-created by Supabase
id UUID PRIMARY KEY
email TEXT UNIQUE
created_at TIMESTAMP
metadata JSONB
```

### `resumes` table
```sql
CREATE TABLE resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, -- e.g., "Master Resume", "Google PM Application"
  is_master BOOLEAN DEFAULT false, -- Only one master per user
  resume_data JSONB NOT NULL, -- Full resume structure (name, contact, education, experience, skills)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Metadata
  tailored_for TEXT, -- Job description it was tailored for (if applicable)
  source_resume_id UUID REFERENCES resumes(id), -- If tailored from another resume
  
  -- Search/filtering
  tags TEXT[], -- e.g., ["product-management", "tech", "leadership"]
  
  CONSTRAINT unique_master_per_user UNIQUE (user_id, is_master) WHERE is_master = true
);

CREATE INDEX idx_resumes_user_id ON resumes(user_id);
CREATE INDEX idx_resumes_is_master ON resumes(user_id, is_master);
```

### `stories` table (Experience Library)
```sql
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, -- e.g., "Reddit AI Agent at EA", "Biosecurity Product Launch"
  company TEXT,
  role TEXT,
  story_type TEXT, -- "achievement", "project", "leadership", "technical"
  
  -- Content
  situation TEXT, -- STAR format: Situation
  task TEXT, -- Task
  action TEXT, -- Action
  result TEXT, -- Result
  bullet_points TEXT[], -- Pre-written bullet points for this story
  
  -- Metadata
  skills TEXT[], -- Skills demonstrated: ["python", "product-management", "ai"]
  metrics TEXT[], -- Key metrics: ["$500K revenue", "4,685 users", "10% cost reduction"]
  tags TEXT[], -- Searchable tags
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  times_used INTEGER DEFAULT 0 -- Track which stories are most reused
);

CREATE INDEX idx_stories_user_id ON stories(user_id);
CREATE INDEX idx_stories_tags ON stories USING GIN(tags);
CREATE INDEX idx_stories_skills ON stories USING GIN(skills);
```

### `chat_sessions` table (Optional - for continuity)
```sql
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
  
  -- Chat data
  messages JSONB, -- Array of {role, content, timestamp}
  status TEXT, -- "in-progress", "completed", "abandoned"
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
```

### `user_preferences` table
```sql
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Personal info (auto-fill for new resumes)
  default_name TEXT,
  default_email TEXT,
  default_phone TEXT,
  default_linkedin TEXT,
  default_location TEXT,
  
  -- Settings
  preferred_format TEXT DEFAULT 'modern', -- Resume style
  auto_save BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Row-Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own resumes" ON resumes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own resumes" ON resumes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own resumes" ON resumes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own resumes" ON resumes
  FOR DELETE USING (auth.uid() = user_id);

-- Same for stories, chat_sessions, user_preferences
```

## API Routes (Vercel Serverless Functions)

### Authentication (handled by Supabase SDK)
- `POST /api/auth/signup` - Create account
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/user` - Get current user

### Resumes
- `GET /api/resumes` - List user's resumes
- `GET /api/resumes/master` - Get master resume
- `GET /api/resumes/:id` - Get specific resume
- `POST /api/resumes` - Create new resume
- `PUT /api/resumes/:id` - Update resume
- `DELETE /api/resumes/:id` - Delete resume
- `POST /api/resumes/:id/duplicate` - Duplicate a resume
- `POST /api/resumes/:id/set-master` - Set as master resume

### Stories
- `GET /api/stories` - List user's stories
- `GET /api/stories/:id` - Get specific story
- `POST /api/stories` - Create story
- `PUT /api/stories/:id` - Update story
- `DELETE /api/stories/:id` - Delete story
- `GET /api/stories/search?q=...` - Search stories by tags/skills

### Claude AI (existing, update to use user_id)
- `POST /api/claude` - Chat with Claude (now saves to DB)

## Data Migration Plan

### Phase 1: Set up infrastructure
1. Create Supabase project
2. Run database migrations
3. Set up RLS policies
4. Configure Supabase in Vercel environment

### Phase 2: Build auth UI
1. Create SignIn/SignUp components
2. Add "Get Started" flow on homepage
3. Update App.jsx with auth context
4. Add user menu/profile in navbar

### Phase 3: Migrate localStorage to database
1. Create API routes for resume CRUD
2. Update App.jsx to fetch from API instead of localStorage
3. Add "Import from browser" feature for existing users

### Phase 4: Add new features
1. Resume library UI (view all saved resumes)
2. Story library UI (manage experiences)
3. Version history
4. Search and filtering

## User Flows

### New User Flow
1. Land on homepage → See "Get Started" button
2. Click "Get Started" → Sign up modal appears
3. Enter email/password → Account created
4. Redirected to empty dashboard → "Build Your First Resume"

### Returning User Flow
1. Land on homepage → See "Sign In" button
2. Sign in → Dashboard shows:
   - Master resume card
   - Recent tailored resumes
   - Story library preview
   - Quick actions: "Build New", "Tailor", "Review"

### Building Resume Flow
1. User starts chat
2. Claude asks questions (same as before)
3. Resume generated → Auto-saved to database
4. User prompted: "Save as Master Resume?" or "Save as [Job Title]"
5. Saved to `resumes` table

### Story Library Flow
1. After building resume, May identifies key stories
2. Prompt: "Want to save these experiences to your Story Library?"
3. Each bullet becomes a searchable story
4. Next time building resume: "Here are relevant stories from your library..."

## Environment Variables

```env
# Vercel serverless function environment
VITE_ANTHROPIC=your-claude-api-key

# Supabase (add these)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key (server-side only)
```

## Frontend Changes

### New Files
- `src/contexts/AuthContext.jsx` - Auth state management
- `src/components/auth/SignIn.jsx` - Sign in form
- `src/components/auth/SignUp.jsx` - Sign up form
- `src/components/auth/AuthModal.jsx` - Modal wrapper
- `src/components/Dashboard.jsx` - User dashboard
- `src/components/ResumeLibrary.jsx` - List all resumes
- `src/components/StoryLibrary.jsx` - Manage stories
- `src/hooks/useAuth.js` - Auth hooks
- `src/hooks/useResumes.js` - Resume CRUD hooks
- `src/hooks/useStories.js` - Story CRUD hooks
- `src/lib/supabase.js` - Supabase client

### Updated Files
- `src/App.jsx` - Wrap in AuthProvider, conditional rendering
- `src/components/Home.jsx` - Add sign-in CTA for logged-out users
- `src/components/Stage1Chatbot.jsx` - Save to DB instead of localStorage
- `src/components/Stage2Tailor.jsx` - Fetch resumes from DB

## Security Considerations

1. **RLS Policies**: Enforce at database level
2. **API Key Protection**: Claude API key stays server-side (already implemented)
3. **Input Validation**: Sanitize all user inputs
4. **Rate Limiting**: Prevent abuse of Claude API
5. **Email Verification**: Optional for beta
6. **Password Requirements**: Min 8 chars, enforce in UI

## Cost Analysis

### Supabase Free Tier
- 50,000 monthly active users
- 500 MB database space
- 1 GB file storage
- 2 GB bandwidth

### Estimated Usage (per user/month)
- Resume data: ~50 KB per resume × 5 resumes = 250 KB
- Stories: ~20 KB per story × 20 stories = 400 KB
- Chat history: ~100 KB per session × 10 sessions = 1 MB
- **Total per user: ~1.65 MB**

**Free tier supports: 500 MB / 1.65 MB ≈ 300 active users**

Paid tier ($25/mo): 8 GB database = ~4,800 users

## Next Steps

1. ✅ Create architecture document (this file)
2. ⏳ Create Supabase project
3. ⏳ Run database migrations
4. ⏳ Set up Supabase SDK in frontend
5. ⏳ Build authentication UI
6. ⏳ Create API routes
7. ⏳ Update components
8. ⏳ Test end-to-end
9. ⏳ Deploy to production

---

**Built with Claude Sonnet 4.5** 🤖
