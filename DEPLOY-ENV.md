# DEPLOY-ENV — Mark SEF Personal Hub

Status **2026-09-07**. The app is fully migrated off Supabase. Sign-in works; **storage still
needs credentials** before anything can be saved.

## Already set on Vercel (Production)

| Variable | Status |
|---|---|
| `VITE_GOOGLE_CLIENT_ID` | ✅ set |
| `SESSION_SECRET` | ✅ set (freshly generated 32-byte hex) |
| `GEMINI_API_KEY` | ✅ already present |

## Still needed: give the app a way to write to Drive

> ⚠️ **A service-account key alone is not enough.** Google refuses service-account *writes*
> into a normal My Drive folder — "Service Accounts do not have storage quota". The Drive
> brick therefore tries two modes in order, and **user-OAuth is the one that actually works**
> for a My Drive folder.

### Mode 1 (preferred) — user OAuth, the app acting as you

Set all three, and the app writes as `m@alone.ltd` into your own Drive:

| Variable | What it is |
|---|---|
| `GOOGLE_CLIENT_ID` | The shared OAuth client id (server-side copy; same client as `VITE_GOOGLE_CLIENT_ID`) |
| `GOOGLE_CLIENT_SECRET` | That client's secret |
| `GOOGLE_REFRESH_TOKEN` | A refresh token for `m@alone.ltd` with a Drive scope |
| `GOOGLE_DRIVE_FOLDER_ID` | Parent folder id. Optional-ish: if the token cannot see it, the app creates its own `SEF Apps Data (Mark SEF Personal Hub)` folder and uses that |

### Mode 2 (fallback) — service account

| Variable | What it is |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | The shared `sef-apps-drive` service-account JSON (same value the `blink-talent` project uses) |
| `GOOGLE_DRIVE_FOLDER_ID` | Parent folder shared with that service account as **Editor** |

Reads and folder listing work in this mode; **writes fail on a My Drive folder** unless the
target is a Shared Drive the service account is a member of. Use Mode 1 unless you have one.

Either way the app creates and uses its own `mark-sef-hub` subfolder inside the parent, so
apps sharing one folder id never collide.

## Setting them

Dashboard: Vercel → project **mark-sef-personal-hub** → Settings → Environment Variables → Add New →
name, value, environment **Production** → Save → Redeploy.

CLI, from `REBUILD/builds/mark-sef-personal-hub`:

```bash
vercel env add GOOGLE_REFRESH_TOKEN production     # paste when prompted
vercel env add GOOGLE_CLIENT_SECRET production
vercel env add GOOGLE_CLIENT_ID production
vercel env add GOOGLE_DRIVE_FOLDER_ID production
git commit --allow-empty -m "chore: redeploy with Drive storage configured" && git push origin main
```

## Verify

```bash
curl -s https://mark-sef-personal-hub.vercel.app/api/health | python3 -m json.tool
```

Expect `"ok": true` with `drive.driveAuthMode` reading `user-oauth` (or
`service-account`), `drive.tokenOk: true` and `drive.folderListStatus: 200`.
`drive.writeOk` is the one that proves saving works — a read-only setup will show
`writeOk: false` with the reason. Then sign in at /admin with m@alone.ltd, edit anything and press **Deploy** — the change should survive a reload.

`/api/health` also reports `gemini.primary` and `gemini.fallback` — the fallback model id
is discovered from Google's ListModels rather than hard-coded, so it cannot rot silently.

## Until then (what a visitor sees today)

- The public site renders instantly from bundled default content — no error, no blank page.
- `/admin` shows the Google sign-in button and, once signed in, a clear
  "storage not configured" banner on every view.
- Every write returns an honest "temporarily unavailable" message, never a fake success.
