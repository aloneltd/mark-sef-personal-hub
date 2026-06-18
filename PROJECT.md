# Mark SEF Personal Hub

**Live URL:** https://mark-sef-personal-hub.vercel.app  
**GitHub:** https://github.com/aloneltd/mark-sef-personal-hub  
**Stack:** React 19 · Vite 6 · Tailwind 3 · Supabase · Vercel

## Environment Variables (set in Vercel dashboard)

| Variable | Where |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for /api/community) |
| `GEMINI_API_KEY` | Google AI Studio key |

## Supabase Setup

Run migrations in order:
1. `supabase/migrations/0000_prelude.sql` — auth helpers
2. `supabase/migrations/0010_hub.sql` — hub_settings + hub_community_members

## Admin Access

- Go to `/admin` — shows a login form
- Sign in with `m@alone.ltd` + password (set in Supabase Auth dashboard)
- Admin panel: Builder, Brand, Theme, AI, Blog, Podcast, Community, Nav tabs
- Click "Deploy" to save all changes to Supabase

## Update Flow

Edit content → Admin panel → Deploy  
Or: edit code → git push → Vercel auto-deploys

## Architecture

- All CMS content stored as a single JSONB blob in `hub_settings` (id=1)
- Community signups go to `hub_community_members` via `/api/community`
- AI Concierge/Chat uses `/api/ai` → Gemini 2.5 Flash (server-side key only)
- Auth: Supabase Auth email/password; only m@alone.ltd gets admin
