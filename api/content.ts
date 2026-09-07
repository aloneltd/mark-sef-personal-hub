import type { VercelRequest, VercelResponse } from '@vercel/node'
import { read, write, StoreUnavailableError, storeConfigured } from './_lib/store.js'
import { requireAdmin } from './_lib/admin.js'

const COLLECTION = 'hub_content'

// GET  — public. Returns the saved CMS document, or { content: null, degraded: true }
//        so the site can render its bundled defaults instead of showing an error.
// PUT  — admin only. Saves the whole document.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=20, stale-while-revalidate=120')
    try {
      const content = await read<Record<string, unknown> | null>(COLLECTION, null)
      return res.status(200).json({ content, degraded: false })
    } catch (e) {
      return res.status(200).json({
        content: null,
        degraded: true,
        reason: e instanceof StoreUnavailableError ? e.message : 'storage unreachable',
      })
    }
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    const session = requireAdmin(req)
    if (!session) return res.status(401).json({ error: 'Admin sign-in required.' })
    if (!storeConfigured()) {
      return res.status(503).json({ error: 'Storage is not configured — add GOOGLE_SERVICE_ACCOUNT_KEY and GOOGLE_DRIVE_FOLDER_ID in Vercel.' })
    }
    const body = req.body as { content?: unknown }
    if (!body?.content || typeof body.content !== 'object') {
      return res.status(400).json({ error: 'content object required' })
    }
    try {
      await write(COLLECTION, body.content)
      return res.status(200).json({ ok: true, savedAt: new Date().toISOString() })
    } catch (e) {
      return res.status(503).json({ error: (e as Error).message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
