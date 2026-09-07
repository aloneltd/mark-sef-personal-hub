import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyGoogleIdToken } from '../_lib/google-auth.js'
import { signSession, makeSessionCookie, sessionSecretConfigured } from '../_lib/session.js'
import { isAllowed, OWNER_EMAIL } from '../_lib/admin.js'

// POST { credential } — the ID token from the Google Identity Services button.
// Nothing the browser claims is trusted: the token's signature, issuer, audience and
// expiry are checked here, and only then is a session cookie issued.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!sessionSecretConfigured()) {
    return res.status(503).json({ error: 'Sign-in is not configured yet (SESSION_SECRET missing).' })
  }

  const credential = (req.body as { credential?: string } | undefined)?.credential
  const identity = await verifyGoogleIdToken(String(credential || ''))
  if (!identity) return res.status(401).json({ error: 'Invalid Google sign-in token.' })
  if (!identity.emailVerified) return res.status(401).json({ error: 'That Google account has no verified email address.' })

  if (!isAllowed(identity.email)) {
    return res.status(403).json({
      error: `${identity.email} is not an admin of this site. Sign in as ${OWNER_EMAIL}.`,
    })
  }

  const token = signSession({ email: identity.email, name: identity.name, picture: identity.picture })
  res.setHeader('Set-Cookie', makeSessionCookie(token))
  return res.status(200).json({ user: { email: identity.email, name: identity.name ?? null, picture: identity.picture ?? null } })
}
