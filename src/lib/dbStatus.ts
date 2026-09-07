// Shared "is the database reachable?" signal + a resilient fetch for supabase-js.
//
// Why: when the Supabase project is paused its hostname stops resolving. supabase-js
// retries idempotent requests 3x with 1s/2s/4s backoff, so a single failed query blocks
// first paint for 7-15s and the site looks dead. This wrapper:
//   1. caps every DB request at DB_TIMEOUT_MS,
//   2. turns network failures into an instant non-retryable 521 response,
//   3. opens a circuit breaker so follow-up queries fail instantly for RETRY_AFTER_MS,
//   4. exposes the status to React so the UI can show an "offline mode" hint.
import { useEffect, useState } from 'react'

export type DbStatus = 'unknown' | 'online' | 'offline'

export const DB_TIMEOUT_MS = 4000
const RETRY_AFTER_MS = 15000

let status: DbStatus = 'unknown'
let offlineSince = 0
let unconfigured = false
const listeners = new Set<(s: DbStatus) => void>()

export const getDbStatus = (): DbStatus => status

export function setDbStatus(next: DbStatus): void {
  if (next === status) return
  status = next
  listeners.forEach((l) => l(next))
}

export function subscribeDbStatus(l: (s: DbStatus) => void): () => void {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

/** Mark the DB as permanently unavailable (env vars missing). */
export function markDbUnconfigured(): void {
  unconfigured = true
  setDbStatus('offline')
}

export function useDbStatus(): DbStatus {
  const [s, setS] = useState<DbStatus>(status)
  useEffect(() => subscribeDbStatus(setS), [])
  return s
}

/** Resolve after `ms` — used to bound initial loads so the UI never waits on a dead DB. */
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function offlineResponse(): Response {
  return new Response(
    JSON.stringify({ message: 'Database unreachable (offline mode)', code: 'DB_OFFLINE', details: null, hint: null }),
    { status: 521, statusText: 'Database Offline', headers: { 'Content-Type': 'application/json' } },
  )
}

export const resilientFetch: typeof fetch = async (input, init) => {
  if (unconfigured) return offlineResponse()
  if (status === 'offline' && Date.now() - offlineSince < RETRY_AFTER_MS) return offlineResponse()

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), DB_TIMEOUT_MS)
  if (init?.signal) init.signal.addEventListener('abort', () => ctrl.abort(), { once: true })
  try {
    const res = await fetch(input, { ...init, signal: ctrl.signal })
    setDbStatus('online')
    return res
  } catch {
    // DNS failure, timeout, CORS/network error — the DB is not reachable right now.
    offlineSince = Date.now()
    setDbStatus('offline')
    return offlineResponse()
  } finally {
    clearTimeout(timer)
  }
}
