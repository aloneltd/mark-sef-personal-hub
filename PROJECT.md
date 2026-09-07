# Mark SEF Personal Hub

**Live URL:** https://mark-sef-personal-hub.vercel.app
**GitHub:** https://github.com/aloneltd/mark-sef-personal-hub
**Stack:** React 19 · Vite 6 · Tailwind 3 · React Router 7 · Vercel Functions · **Google Drive (JSON store)** · **Google Sign-In** · Gemini 2.5 Flash

> **Supabase has been removed** (2026-09-07). The app is Google-native, per
> `REBUILD/BLUEPRINT/00-FOUNDATION.md`: a service account owns a Drive folder that holds one
> small JSON file per collection, and identity is Google Sign-In verified server-side.
> `@supabase/supabase-js` is no longer a dependency and no Supabase env var is read anywhere.

## Environment variables (Vercel → Settings → Environment Variables → Production)

| Variable | Secret? | What it is |
|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | yes | The shared service-account JSON (same value as the `blink-talent` project) |
| `GOOGLE_DRIVE_FOLDER_ID` | no | The shared parent Drive folder id (same value as `blink-talent`). The app creates and uses its own `mark-sef-hub` subfolder inside it, so apps never collide |
| `SESSION_SECRET` | yes | Random 32-byte hex; signs the session cookie |
| `VITE_GOOGLE_CLIENT_ID` | no | `715096174344-pp2585bv5l2ji2ss1c734pr9mj2etn6e.apps.googleusercontent.com` |
| `GEMINI_API_KEY` | yes | Google AI Studio key for `/api/ai` |

Optional: `DRIVE_SUBFOLDER` overrides the subfolder name. `LOCAL_STORE_DIR` swaps the Drive
backend for plain files on disk — **local development only, never set it in production.**

See `DEPLOY-ENV.md` for the exact commands and current status.

## Architecture

```
browser ──► /api/*  (Vercel serverless, the only layer that talks to Google)
              ├─ /api/content      GET public · PUT admin      → hub_content.json
              ├─ /api/community    POST public · GET/DELETE admin → community_members.json
              ├─ /api/auth/google  POST { credential }  → verify → session cookie
              ├─ /api/auth/me      GET  → { user, isAdmin }
              ├─ /api/auth/signout POST → clears the cookie
              ├─ /api/ai           POST → Gemini 2.5 Flash (key server-side only)
              └─ /api/health       GET  → non-secret wiring diagnostics
```

- **`api/_lib/store.ts` is the one data layer.** Routes never touch Drive directly. Reads are
  cached in-memory for 20s per warm lambda; every write busts the entry. Swapping the backend
  later (Supabase, Postgres) is a change to `api/_lib/drive.ts` only — that seam is the whole
  migration plan (Foundation §J).
- **Collections** are single JSON files in the app's Drive subfolder: `hub_content.json` (the
  whole CMS document) and `community_members.json`.
- **Resilience:** if storage is unreachable or unconfigured, `GET /api/content` returns
  `{ content: null, degraded: true }` and the site renders its bundled `DEFAULT_CONTENT`
  instantly. The public site never waits on, or dies with, the database.
- **Writes fail honestly** — a clear "storage is not configured" message, never a fake success.

## Auth

Google Identity Services renders the sign-in button; the ID token it returns is POSTed to
`/api/auth/google`, which verifies the **signature (Google JWKS), issuer, audience and expiry
server-side**, checks the email against the allowlist (`m@alone.ltd` only), and then issues an
**HttpOnly · Secure · SameSite=Lax HMAC-signed session cookie**. The browser holds no token, no
secret, and no admin decision — every write re-checks the cookie server-side.

- Wrong Google account → **403** with a clear message.
- Invalid/forged/expired token → **401**.
- No session on a write → **401**.

## Admin

`/admin` → Sign in with Google as `m@alone.ltd` → Builder · Brand · Theme · AI · Blog ·
Podcast · Community · Nav tabs → **Deploy** saves the document to Drive.
The Community → Registry tab reads real signups from `/api/community`.

## Update flow

Edit content in `/admin` → Deploy. Or edit code → `git push origin main` → Vercel auto-deploys.

## Local development

```bash
npm install
npm run build              # tsc (src) + tsc (api) + vite build
LOCAL_STORE_DIR=/tmp/hubstore SESSION_SECRET=dev VITE_GOOGLE_CLIENT_ID=… node <shim> .
```
`LOCAL_STORE_DIR` runs the entire app — content, signups, sessions — against files on disk,
so the whole stack is testable with no Google credentials.
