// The one server-side data layer. Everything above it (API routes) uses ONLY this file;
// swapping Drive for another backend later is a change to drive.ts, not to any route.
//
// Shape: one JSON file per collection in the app's Drive folder. Reads are cached
// in-memory for CACHE_TTL_MS so a warm lambda serves the public site without a Drive
// round-trip; every write busts the entry.
import { randomUUID } from 'node:crypto'
import { isConfigured, readJson, writeJson } from './drive.js'

export const CACHE_TTL_MS = 20_000

interface Entry { value: unknown; at: number }
const cache = new Map<string, Entry>()

export class StoreUnavailableError extends Error {
  constructor(message: string) { super(message); this.name = 'StoreUnavailableError' }
}

export function storeConfigured(): boolean { return isConfigured() }

function file(collection: string): string { return `${collection}.json` }

/** Read a collection. Throws StoreUnavailableError when storage is not configured/reachable. */
export async function read<T>(collection: string, fallback: T): Promise<T> {
  if (!isConfigured()) throw new StoreUnavailableError('Storage is not configured (GOOGLE_SERVICE_ACCOUNT_KEY / GOOGLE_DRIVE_FOLDER_ID missing)')
  const hit = cache.get(collection)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value as T
  try {
    const value = await readJson<T>(file(collection), fallback)
    cache.set(collection, { value, at: Date.now() })
    return value
  } catch (e) {
    throw new StoreUnavailableError(String((e as Error).message).slice(0, 200))
  }
}

/** Read a collection, falling back silently when storage is down (public reads). */
export async function readSafe<T>(collection: string, fallback: T): Promise<{ data: T; degraded: boolean }> {
  try {
    return { data: await read<T>(collection, fallback), degraded: false }
  } catch {
    return { data: fallback, degraded: true }
  }
}

export async function write(collection: string, value: unknown): Promise<void> {
  if (!isConfigured()) throw new StoreUnavailableError('Storage is not configured (GOOGLE_SERVICE_ACCOUNT_KEY / GOOGLE_DRIVE_FOLDER_ID missing)')
  try {
    await writeJson(file(collection), value)
    cache.set(collection, { value, at: Date.now() })
  } catch (e) {
    cache.delete(collection)
    throw new StoreUnavailableError(String((e as Error).message).slice(0, 200))
  }
}

export function invalidate(collection?: string): void {
  if (collection) cache.delete(collection); else cache.clear()
}

export const newId = (): string => randomUUID()
export const nowIso = (): string => new Date().toISOString()
