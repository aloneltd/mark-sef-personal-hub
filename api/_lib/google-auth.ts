// Verifies a Google Identity Services ID token SERVER-SIDE.
//
// The browser gets a credential from the GIS button and POSTs it here; nothing the browser
// says about who it is, is trusted. Primary path: RS256 signature check against Google's
// JWKS. Fallback: Google's tokeninfo endpoint (used if JWKS is unavailable).
import { createPublicKey, createVerify } from 'node:crypto'

const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs'
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com']

export interface GoogleIdentity {
  email: string
  emailVerified: boolean
  name?: string
  picture?: string
  sub: string
}

interface Jwk { kid: string; n: string; e: string; kty: string; alg?: string }
let _jwks: { keys: Jwk[] } | null = null
let _jwksAt = 0
const JWKS_TTL_MS = 60 * 60 * 1000

async function getJwks(): Promise<{ keys: Jwk[] }> {
  if (_jwks && Date.now() - _jwksAt < JWKS_TTL_MS) return _jwks
  const res = await fetch(JWKS_URL)
  if (!res.ok) throw new Error(`JWKS fetch failed (${res.status})`)
  _jwks = await res.json() as { keys: Jwk[] }
  _jwksAt = Date.now()
  return _jwks
}

function decodeSegment<T>(seg: string): T {
  return JSON.parse(Buffer.from(seg, 'base64url').toString()) as T
}

function audienceOk(aud: unknown): boolean {
  const expected = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
  if (!expected) return false
  return aud === expected
}

/** Returns the verified identity, or null when the token is invalid/expired/wrong audience. */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity | null> {
  if (!idToken || typeof idToken !== 'string' || idToken.split('.').length !== 3) return null
  try {
    const [h, p, s] = idToken.split('.')
    const header = decodeSegment<{ kid?: string; alg?: string }>(h)
    const claims = decodeSegment<Record<string, unknown>>(p)

    if (header.alg !== 'RS256') return null
    if (!ISSUERS.includes(String(claims.iss))) return null
    if (!audienceOk(claims.aud)) return null
    if (typeof claims.exp !== 'number' || claims.exp < Math.floor(Date.now() / 1000)) return null

    const jwks = await getJwks()
    const jwk = jwks.keys.find(k => k.kid === header.kid)
    if (!jwk) return null

    const key = createPublicKey({ key: jwk as unknown as import('node:crypto').JsonWebKey, format: 'jwk' })
    const verifier = createVerify('RSA-SHA256')
    verifier.update(`${h}.${p}`)
    if (!verifier.verify(key, Buffer.from(s, 'base64url'))) return null

    const email = String(claims.email || '').toLowerCase()
    if (!email) return null
    return {
      email,
      emailVerified: claims.email_verified === true || claims.email_verified === 'true',
      name: claims.name ? String(claims.name) : undefined,
      picture: claims.picture ? String(claims.picture) : undefined,
      sub: String(claims.sub || ''),
    }
  } catch {
    return verifyViaTokenInfo(idToken)
  }
}

async function verifyViaTokenInfo(idToken: string): Promise<GoogleIdentity | null> {
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`)
    if (!res.ok) return null
    const info = await res.json() as Record<string, unknown>
    if (!ISSUERS.includes(String(info.iss))) return null
    if (!audienceOk(info.aud)) return null
    const email = String(info.email || '').toLowerCase()
    if (!email) return null
    return {
      email,
      emailVerified: info.email_verified === true || info.email_verified === 'true',
      name: info.name ? String(info.name) : undefined,
      picture: info.picture ? String(info.picture) : undefined,
      sub: String(info.sub || ''),
    }
  } catch {
    return null
  }
}
