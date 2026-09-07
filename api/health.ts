import type { VercelRequest, VercelResponse } from '@vercel/node'
import { driveHealth, driveWriteProbe } from './_lib/drive.js'
import { read, CACHE_TTL_MS } from './_lib/store.js'

// Public, non-secret health check: is the backend wired up? Never returns key material.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const drive = await driveHealth()

  let storeRead: Record<string, unknown> = { ok: false }
  if (drive.tokenOk === true) {
    const t0 = Date.now()
    try {
      const content = await read<Record<string, unknown> | null>('hub_content', null)
      storeRead = { ok: true, ms: Date.now() - t0, hasSavedContent: !!content }
    } catch (e) {
      storeRead = { ok: false, error: String((e as Error).message).slice(0, 160) }
    }
  }

  // /api/health?probe=write actually writes (and deletes) a file, so a read-only
  // identity cannot look healthy while every save silently fails.
  const write = req.query?.probe === 'write' ? await driveWriteProbe() : undefined

  // ok is mode-agnostic: keyParses only applies to service-account mode, so gating
  // on it would make a healthy user-OAuth deployment report unhealthy.
  const ok = drive.configured === true && drive.tokenOk === true && drive.folderListStatus === 200
  res.setHeader('Cache-Control', 'no-store')
  res.status(ok ? 200 : 503).json({
    ok,
    time: new Date().toISOString(),
    storage: 'google-drive-json',
    cacheTtlMs: CACHE_TTL_MS,
    auth: { provider: 'google-identity-services', clientId: !!process.env.VITE_GOOGLE_CLIENT_ID, sessionSecret: !!process.env.SESSION_SECRET },
    gemini: { configured: !!process.env.GEMINI_API_KEY },
    drive,
    storeRead,
    ...(write ? { write } : {}),
  })
}
