# Hospice Referral Intelligence — Setup Guide

## Prerequisites

- Node.js 18+ and npm
- A Supabase account (free tier works)
- An OpenAI API key

---

## 1. Install Node.js

**macOS (Homebrew):**
```bash
brew install node
```

**Or download from:** https://nodejs.org (LTS version recommended)

Verify installation:
```bash
node --version   # Should show v18+ or v20+
npm --version
```

---

## 2. Create a Supabase Project

1. Go to https://supabase.com and create a new project.
2. Once your project is ready, go to **Settings > API** and copy:
   - **Project URL** (e.g., `https://abc123.supabase.co`)
   - **Anon public key**
3. Go to the **SQL Editor** in Supabase and paste the entire contents of
   `lib/supabase/schema.sql`, then click **Run**.
   This creates the `profiles`, `voice_notes`, and `call_logs` tables,
   Row Level Security policies, and the `voice-notes` storage bucket.

### Important Supabase Settings

- **Authentication > Email Auth:** Make sure "Enable Email Signup" is ON.
  For faster testing, disable "Confirm email" under Email Auth settings.
- **Storage:** The schema SQL already creates the `voice-notes` bucket.
  Verify it appears under Storage in the Supabase dashboard.

---

## 3. Get an OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Create a new secret key.
3. Make sure your account has access to `whisper-1` and `gpt-4o` models.

---

## 4. Configure Environment Variables

Copy the example env file and fill in your values:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
OPENAI_API_KEY=sk-your_openai_key_here
```

---

## 5. Install Dependencies and Run Locally

```bash
cd hospice-referral-intelligence
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

---

## 6. Deploy to Vercel

### Option A: Vercel CLI
```bash
npm i -g vercel
vercel
```

### Option B: GitHub Integration
1. Push the project to a GitHub repository.
2. Go to https://vercel.com/new and import the repo.
3. In **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
4. Click **Deploy**.

---

## Usage

1. **Sign up** at `/signup` with your email and password.
2. Navigate to **Record Visit** (`/record`).
3. Click **Start Recording** and describe your referral visit.
4. Click **Stop**, review the playback, then click **Submit Note**.
5. AI will transcribe your note and extract structured call log data.
6. View results in **Call Logs** (`/calllogs`).
7. Check **Follow-Ups** (`/followups`) for scheduled follow-ups.
8. See weekly stats on **Reports** (`/reports`).

---

## Project Structure

```
hospice-referral-intelligence/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx        # Login page
│   │   ├── signup/page.tsx       # Signup page
│   │   └── layout.tsx            # Auth layout (centered card)
│   ├── (dashboard)/
│   │   ├── dashboard/page.tsx    # Dashboard home
│   │   ├── record/page.tsx       # Voice recorder
│   │   ├── calllogs/page.tsx     # Call logs table
│   │   ├── followups/page.tsx    # Follow-up tracker
│   │   ├── reports/page.tsx      # Weekly stats
│   │   └── layout.tsx            # Dashboard layout (sidebar)
│   ├── api/
│   │   ├── transcribe/route.ts   # Whisper transcription endpoint
│   │   └── extract/route.ts      # GPT-4 extraction endpoint
│   ├── globals.css
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Redirect to /dashboard
├── components/
│   ├── Sidebar.tsx
│   ├── PageHeader.tsx
│   └── ui/
│       ├── Card.tsx
│       └── Badge.tsx
├── hooks/
│   └── useAudioRecorder.ts       # Browser audio recording hook
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client
│   │   ├── server.ts             # Server Supabase client
│   │   ├── middleware.ts          # Auth session middleware
│   │   └── schema.sql            # Full database schema
│   └── types.ts                  # TypeScript types
├── utils/
│   └── formatDuration.ts
├── middleware.ts                  # Next.js middleware (auth guard)
├── .env.local.example
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
└── next.config.mjs
```
