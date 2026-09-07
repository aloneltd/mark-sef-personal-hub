// Picks the cheap fallback model by ASKING Google which models this key can actually use,
// rather than hard-coding an id.
//
// Why: hard-coding `gemini-2.5-flash-lite` shipped a 404 — Google's own ListModels endpoint
// still lists it (it "supports generateContent") but actually calling it 404s with "this model
// is no longer available to new users" on this account. So listing alone isn't proof a model
// works — this module also remembers, per warm lambda, any model id that a real call proved
// broken, and skips it on the next request, self-healing without a redeploy.

const LIST_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const LIST_TTL_MS = 60 * 60 * 1000
const BROKEN_TTL_MS = 6 * 60 * 60 * 1000

export const PRIMARY_MODEL = 'gemini-2.5-flash'

let _names: string[] | undefined
let _namesAt = 0
const _broken = new Map<string, number>() // modelId -> expiresAt

/** Call when a real generateContent request against `modelId` proves it unusable (404/NOT_FOUND). */
export function markModelBroken(modelId: string): void {
  _broken.set(modelId, Date.now() + BROKEN_TTL_MS)
}

function isKnownBroken(modelId: string): boolean {
  const exp = _broken.get(modelId)
  if (exp === undefined) return false
  if (Date.now() > exp) {
    _broken.delete(modelId)
    return false
  }
  return true
}

/** Rank candidates: cheapest usable flash-lite first, then any flash, never the primary or a known-broken id. */
function rank(names: string[]): string[] {
  const usable = names.filter(n => n !== PRIMARY_MODEL && !isKnownBroken(n) && !/vision|embedding|aqa|tts|image|live|native-audio/i.test(n))
  const score = (n: string) => {
    if (/flash-lite/.test(n)) return 0
    if (/flash/.test(n)) return 1
    return 2
  }
  return usable.filter(n => score(n) < 2).sort((a, b) => score(a) - score(b) || a.localeCompare(b))
}

async function listNames(): Promise<string[]> {
  if (_names !== undefined && Date.now() - _namesAt < LIST_TTL_MS) return _names
  try {
    const res = await fetch(`${LIST_URL}?key=${encodeURIComponent(process.env.GEMINI_API_KEY || '')}&pageSize=200`)
    if (!res.ok) throw new Error(`list models ${res.status}`)
    const body = await res.json() as { models?: { name?: string; supportedGenerationMethods?: string[] }[] }
    _names = (body.models ?? [])
      .filter(m => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent'))
      .map(m => (m.name ?? '').replace(/^models\//, ''))
      .filter(Boolean)
  } catch {
    _names = []
  }
  _namesAt = Date.now()
  return _names
}

/** Ranked fallback candidates (best first), with known-broken ids already excluded. May be empty. */
export async function getFallbackModels(): Promise<string[]> {
  return rank(await listNames())
}

/** The single best fallback candidate, or null. Kept for callers that only want one try. */
export async function getFallbackModel(): Promise<string | null> {
  const [first] = await getFallbackModels()
  return first ?? null
}

/** True for quota/rate-limit/overload errors, which are worth retrying on a lighter model. */
export function isOverloaded(err: unknown): boolean {
  const m = String((err as Error)?.message ?? err)
  return /\b429\b|\b503\b|RESOURCE_EXHAUSTED|quota|rate.?limit|overloaded|UNAVAILABLE/i.test(m)
}

/** True for a model id that generateContent has rejected as retired/unavailable — worth blacklisting. */
export function isModelUnavailable(err: unknown): boolean {
  const m = String((err as Error)?.message ?? err)
  return /\b404\b|NOT_FOUND|no longer available/i.test(m)
}

/** Non-secret model diagnostics for /api/health. */
export async function modelHealth(): Promise<Record<string, unknown>> {
  if (!process.env.GEMINI_API_KEY) return { configured: false }
  const candidates = await getFallbackModels()
  return { configured: true, primary: PRIMARY_MODEL, fallback: candidates[0] ?? null, fallbackCandidates: candidates.slice(0, 5) }
}
