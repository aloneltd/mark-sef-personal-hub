# DEPLOY-ENV — Mark SEF Personal Hub

Status as of **2026-09-07**. The app is fully migrated off Supabase; two env vars still need
to be copied over before the admin can save and signups can persist.

## Already set on Vercel (done 2026-09-07)

| Variable | Status |
|---|---|
| `VITE_GOOGLE_CLIENT_ID` | ✅ set (Production) |
| `SESSION_SECRET` | ✅ set (Production) — freshly generated 32-byte hex |
| `GEMINI_API_KEY` | ✅ already present |

## Still needed — 2 values, both already live on the `blink-talent` project

These two are **encrypted** on Vercel, so they can only be read by you (or from your own
records). They are exactly the same values `blink-talent` uses — that project's
`/api/health` proves they work today.

| Variable | Where the value lives |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Vercel → project **blink-talent** → Settings → Environment Variables → `GOOGLE_SERVICE_ACCOUNT_KEY` (click the eye / "Copy Value"). It is the shared `sef-apps-drive` service-account JSON under `m@alone.ltd` |
| `GOOGLE_DRIVE_FOLDER_ID` | Same place, `GOOGLE_DRIVE_FOLDER_ID`. It is the parent Drive folder shared with that service account as **Editor** |

You do **not** need a new folder: this app creates and uses its own `mark-sef-hub` subfolder
inside that parent, so it can never collide with blink-talent's data.

### Option A — dashboard (easiest)

1. Vercel → **blink-talent** → Settings → Environment Variables → copy each value.
2. Vercel → **mark-sef-personal-hub** → Settings → Environment Variables → **Add New** →
   name, value, environment **Production** → Save.
3. Redeploy (Deployments → ⋯ → Redeploy, or just `git push`).

### Option B — CLI, from this folder

```bash
cd REBUILD/builds/mark-sef-personal-hub

# paste the service-account JSON when prompted (it is one long line)
vercel env add GOOGLE_SERVICE_ACCOUNT_KEY production

# paste the folder id when prompted
vercel env add GOOGLE_DRIVE_FOLDER_ID production

git commit --allow-empty -m "chore: redeploy with Drive storage configured" && git push origin main
```

Or non-interactively, if you have the values in files:

```bash
cat ~/path/to/sef-apps-drive.json | tr -d '\n' | vercel env add GOOGLE_SERVICE_ACCOUNT_KEY production
printf '<FOLDER_ID>' | vercel env add GOOGLE_DRIVE_FOLDER_ID production
```

## Verify it worked

```bash
curl -s https://mark-sef-personal-hub.vercel.app/api/health | python3 -m json.tool
```

Expect `"ok": true`, `drive.tokenOk: true`, `drive.folderListStatus: 200` and
`storeRead.ok: true`. Then sign in at `/admin` with `m@alone.ltd`, edit anything, press
**Deploy** — the public site should show the change on reload, and
`drive.collections` in `/api/health` should list `hub_content.json`.

## Until then (what a visitor sees today)

- The public site renders instantly from bundled default content — no error, no blank page.
- `/admin` shows the Google sign-in button plus a clear "STORAGE NOT CONFIGURED" notice.
- Community signup returns an honest "temporarily unavailable" message, never a fake success.
