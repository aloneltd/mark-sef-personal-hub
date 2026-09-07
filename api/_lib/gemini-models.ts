// Picks the cheap fallback model by ASKING Google which models this key can actually use,
// rather than hard-coding an id.
//
// Why: hard-coding `gemini-2.5-flash-lite` shipped a 404 — Google now answers
// "this model is no longer available to new users" for it on this account. A guessed model
// id is a dependency that can rot without warning, so the list is fetched (once per warm
// lambda, cached for an hour) and a real id is chosen from it.

const LIST_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const TTL_MS = 60 * 60 * 1000

export const PRIMARY_MODEL = 'gemini-2.5-flash'

let _fallback: string | null | undefined
let _at = 0

/** Rank candidates: cheapest usable flash-lite first, then any flash, never the primary. */
function pick(names: string[]): string | null {
  const usable = names.filter(n => n !== PRIMARY_MODEL && !/vision|embedding|aqa|tts|image|live|native-audio/i.test(n))
  const score = (n: string) => {
    if (/flash-lite/.test(n)) return 0
    if (/flash/.test(n)) return 1
    return 2
  }
  const sorted = usable.filter(n => score(n) < 2).sort((a, b) => score(a) - score(b) || a.localeCompare(b))
  return sorted[0] ?? null
}

/** The best available cheap model, or null when none can be determined. */
export async function getFallbackModel(): Promise<string | null> {
  if (_fallback !== undefined && Date.now() - _at < TTL_MS) return _fallback
  try {
    const res = await fetch(`${LIST_URL}?key=${encodeURIComponent(process.env.GEMINI_API_KEY || '')}&pageSize=200`)
    if (!res.ok) throw new Error(`list models ${res.status}`)
    const body = await res.json() as { models?: { name?: string; supportedGenerationMethods?: string[] }[] }
    const names = (body.models ?? [])
      .filter(m => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent'))
      .map(m => (m.name ?? '').replace(/^models\//, ''))
      .filter(Boolean)
    _fallback = pick(names)
  } catch {
    _fallback = null
  }
  _at = Date.now()
  return _fallback
}

/** True for quota/rate-limit/overload errors, which are worth retrying on a lighter model. */
export function isOverloaded(err: unknown): boolean {
  const m = String((err as Error)?.message ?? err)
  return /\b429\b|\b503\b|RESOURCE_EXHAUSTED|quota|rate.?limit|overloaded|UNAVAILABLE/i.test(m)
}

/** Non-secret model diagnostics for /api/health. */
export async function modelHealth(): Promise<Record<string, unknown>> {
  if (!process.env.GEMINI_API_KEY) return { configured: false }
  return { configured: true, primary: PRIMARY_MODEL, fallback: await getFallbackModel() }
}
