import type { VercelRequest, VercelResponse } from '@vercel/node'
import { read, write, newId, nowIso, StoreUnavailableError, storeConfigured } from './_lib/store.js'
import { requireAdmin } from './_lib/admin.js'

const COLLECTION = 'community_members'

interface Member {
  id: string
  email: string
  role: string
  joinDate: string
  fields: Record<string, unknown>
}

// POST   — public signup (dedupes by email)
// GET    — admin only, the registry
// DELETE — admin only, ?id=…
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    const { email, fields } = (req.body || {}) as { email?: string; fields?: Record<string, unknown> }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required.' })
    }
    if (!storeConfigured()) {
      return res.status(503).json({ error: 'Signups are temporarily unavailable — storage is not configured yet.' })
    }
    try {
      const members = await read<Member[]>(COLLECTION, [])
      const normalized = email.trim().toLowerCase()
      if (members.some(m => m.email === normalized)) {
        return res.status(200).json({ ok: true, message: 'Already registered' })
      }
      members.push({ id: newId(), email: normalized, role: 'member', joinDate: nowIso(), fields: fields || {} })
      await write(COLLECTION, members)
      return res.status(200).json({ ok: true })
    } catch (e) {
      const msg = e instanceof StoreUnavailableError
        ? 'Signups are temporarily unavailable — the registry could not be reached.'
        : 'Signup failed.'
      return res.status(503).json({ error: msg })
    }
  }

  const session = requireAdmin(req)
  if (!session) return res.status(401).json({ error: 'Admin sign-in required.' })

  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store')
    try {
      return res.status(200).json({ members: await read<Member[]>(COLLECTION, []) })
    } catch (e) {
      return res.status(503).json({ error: (e as Error).message, members: [] })
    }
  }

  if (req.method === 'DELETE') {
    const id = String((req.query?.id as string) || (req.body as { id?: string })?.id || '')
    if (!id) return res.status(400).json({ error: 'id required' })
    try {
      const members = await read<Member[]>(COLLECTION, [])
      await write(COLLECTION, members.filter(m => m.id !== id))
      return res.status(200).json({ ok: true })
    } catch (e) {
      return res.status(503).json({ error: (e as Error).message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
