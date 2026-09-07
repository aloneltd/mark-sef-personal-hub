// HMAC-signed, HttpOnly session cookie. The browser holds an opaque token it cannot forge;
// the server is the only place that decides who is an admin.
import { createHmac, timingSafeEqual } from 'node:crypto'

const COOKIE_NAME = 'hub_session'
const MAX_AGE = 7 * 24 * 60 * 60

export interface SessionPayload {
  email: string
  name?: string
  picture?: string
  exp: number
}

function secret(): string {
  const s = process.env.SESSION_SECRET
  if (!s) throw new Error('SESSION_SECRET env var not set')
  return s
}

export function sessionSecretConfigured(): boolean { return !!process.env.SESSION_SECRET }

export function signSession(payload: Omit<SessionPayload, 'exp'>): string {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE
  const b64 = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url')
  const sig = createHmac('sha256', secret()).update(b64).digest('base64url')
  return `${b64}.${sig}`
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const dot = token.lastIndexOf('.')
    if (dot === -1) return null
    const b64 = token.slice(0, dot)
    const sig = Buffer.from(token.slice(dot + 1))
    const expected = Buffer.from(createHmac('sha256', secret()).update(b64).digest('base64url'))
    if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString()) as SessionPayload
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

export function getSessionFromRequest(req: { headers: Record<string, string | string[] | undefined> }): SessionPayload | null {
  const cookieHeader = (req.headers['cookie'] as string) || ''
  if (!cookieHeader) return null
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq).trim() !== COOKIE_NAME) continue
    const raw = part.slice(eq + 1).trim()
    let token = raw
    try { token = decodeURIComponent(raw) } catch { /* keep raw */ }
    return verifySession(token)
  }
  return null
}

export function makeSessionCookie(token: string): string {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}; Path=/`
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/`
}
