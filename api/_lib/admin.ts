// Who is allowed into /admin. Single-operator gate (Foundation §C gate 1).
import { getSessionFromRequest, type SessionPayload } from './session.js'

export const OWNER_EMAIL = 'm@alone.ltd'

export function isAllowed(email: string): boolean {
  return email.trim().toLowerCase() === OWNER_EMAIL
}

/** Returns the admin session, or null. Callers must 401/403 themselves. */
export function requireAdmin(req: { headers: Record<string, string | string[] | undefined> }): SessionPayload | null {
  const s = getSessionFromRequest(req)
  if (!s || !isAllowed(s.email)) return null
  return s
}
