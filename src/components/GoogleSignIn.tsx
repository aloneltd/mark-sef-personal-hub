import React, { useEffect, useRef, useState } from 'react'
import { GOOGLE_CLIENT_ID, loadGoogleIdentityServices, signInWithGoogleCredential } from '../lib/auth'

interface Props {
  onSignedIn: () => void
  theme?: 'outline' | 'filled_black'
}

/**
 * Renders the official Google Sign-In button. The credential it produces is sent
 * straight to /api/auth/google, which verifies it and issues the session cookie.
 */
export const GoogleSignIn: React.FC<Props> = ({ onSignedIn, theme = 'filled_black' }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setError('Google sign-in is not configured — set VITE_GOOGLE_CLIENT_ID in Vercel.')
      return
    }
    let cancelled = false
    loadGoogleIdentityServices()
      .then(() => {
        if (cancelled || !ref.current) return
        const google = (window as any).google
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response: { credential: string }) => {
            setBusy(true)
            setError('')
            try {
              await signInWithGoogleCredential(response.credential)
              onSignedIn()
            } catch (e: any) {
              setError(e?.message || 'Sign-in failed.')
            } finally {
              setBusy(false)
            }
          },
        })
        google.accounts.id.renderButton(ref.current, {
          theme,
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          width: 320,
        })
        setReady(true)
      })
      .catch((e: Error) => setError(e.message))
    return () => { cancelled = true }
  }, [onSignedIn, theme])

  return (
    <div className="space-y-3">
      <div ref={ref} data-testid="google-signin" className="flex justify-center min-h-[44px]" />
      {!ready && !error && <p className="text-[10px] mono uppercase text-neutral-600 text-center">Loading Google sign-in…</p>}
      {busy && <p className="text-[10px] mono uppercase text-neutral-400 text-center">Verifying…</p>}
      {error && <p className="text-red-400 text-xs mono" data-testid="signin-error">{error}</p>}
    </div>
  )
}

export default GoogleSignIn
