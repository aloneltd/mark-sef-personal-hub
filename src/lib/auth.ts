// Client half of Google sign-in. The browser only ever holds a Google ID token long
// enough to POST it to /api/auth/google; the server verifies it and sets an HttpOnly
// session cookie. No tokens, no secrets and no admin decision live in the browser.
import { timedFetch } from './dbStatus'

export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) || ''

export interface AuthUser {
  email: string
  name: string | null
  picture: string | null
}

export interface AuthState {
  user: AuthUser | null
  isAdmin: boolean
}

export async function getSession(): Promise<AuthState> {
  try {
    const res = await timedFetch('/api/auth/me', { credentials: 'same-origin' })
    if (!res.ok) return { user: null, isAdmin: false }
    return await res.json() as AuthState
  } catch {
    return { user: null, isAdmin: false }
  }
}

export async function signInWithGoogleCredential(credential: string): Promise<AuthState> {
  const res = await timedFetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ credential }),
  }, 10000)
  const body = await res.json().catch(() => ({})) as { error?: string; user?: AuthUser }
  if (!res.ok) throw new Error(body.error || `Sign-in failed (${res.status})`)
  return { user: body.user ?? null, isAdmin: true }
}

export async function signOut(): Promise<void> {
  try { await timedFetch('/api/auth/signout', { method: 'POST', credentials: 'same-origin' }) } catch { /* ignore */ }
}

/** Loads the Google Identity Services script once. */
let gisPromise: Promise<void> | null = null
export function loadGoogleIdentityServices(): Promise<void> {
  if (gisPromise) return gisPromise
  gisPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('no window'))
    if ((window as any).google?.accounts?.id) return resolve()
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Could not load Google sign-in.'))
    document.head.appendChild(s)
  })
  return gisPromise
}
