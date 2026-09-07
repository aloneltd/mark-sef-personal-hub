import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSessionFromRequest } from '../_lib/session.js'
import { isAllowed } from '../_lib/admin.js'

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  let session = null
  try { session = getSessionFromRequest(req) } catch { session = null }
  if (!session) return res.status(200).json({ user: null, isAdmin: false })
  return res.status(200).json({
    user: { email: session.email, name: session.name ?? null, picture: session.picture ?? null },
    isAdmin: isAllowed(session.email),
  })
}
