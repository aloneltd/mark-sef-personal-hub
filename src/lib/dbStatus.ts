// Shared "is the content store reachable?" signal.
//
// The public site NEVER waits on storage: every call to /api/* is bounded by
// API_TIMEOUT_MS and falls back to the bundled defaults. This module just exposes
// whether the last call succeeded so the UI can show a subtle "offline mode" hint.
import { useEffect, useState } from 'react'

export type DbStatus = 'unknown' | 'online' | 'offline'

export const DB_TIMEOUT_MS = 4000

let status: DbStatus = 'unknown'
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

export function useDbStatus(): DbStatus {
  const [s, setS] = useState<DbStatus>(status)
  useEffect(() => subscribeDbStatus(setS), [])
  return s
}

/** Resolve after `ms` — used to bound initial loads so the UI never waits on storage. */
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** fetch() with a hard timeout. Throws on timeout or network failure. */
export async function timedFetch(input: RequestInfo, init?: RequestInit, ms = DB_TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(input, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}
