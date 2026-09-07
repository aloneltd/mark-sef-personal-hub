import { GoogleGenAI } from '@google/genai'
import type { VercelRequest, VercelResponse } from '@vercel/node'

// Module-level: allocated once per warm serverless instance
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

const responseCache = new Map<string, { text: string; expiresAt: number }>()
const CACHE_TTL = 300_000

// Free-tier guard: 10 req/min per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (entry.count >= 10) return false
  entry.count++
  return true
}

/** True for quota/rate-limit/overload errors, which are worth retrying on a lighter model. */
function isOverloaded(err: unknown): boolean {
  const m = String((err as Error)?.message ?? err)
  return /\b429\b|\b503\b|RESOURCE_EXHAUSTED|quota|rate.?limit|overloaded|UNAVAILABLE/i.test(m)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown'
  if (!checkRateLimit(ip)) return res.status(429).json({ error: 'Too many requests. Please wait a moment.' })

  const { messages, systemInstruction, useSearch = false, temperature = 0.7 } = req.body
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' })
  }

  const lastMsg = (messages as { role: string; text: string }[]).filter((m) => m.role === 'user').at(-1)?.text ?? ''
  const cacheKey = `gemini-2.5-flash::${systemInstruction ?? ''}::${lastMsg}`
  const now = Date.now()
  const cached = responseCache.get(cacheKey)
  if (cached && now < cached.expiresAt) return res.status(200).json({ text: cached.text })

  try {
    const config: Record<string, unknown> = {
      systemInstruction: systemInstruction || undefined,
      temperature,
      maxOutputTokens: 2048,
    }
    if (useSearch) config.tools = [{ googleSearch: {} }]

    const contents = messages.slice(-10).map((m: { role: string; text: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }))

    const ask = (model: string) => Promise.race([
      ai.models.generateContent({ model, contents, config }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000)),
    ])

    let response
    try {
      response = await ask('gemini-2.5-flash')
    } catch (err: any) {
      // Rate limited or the model is busy — drop to the lighter model rather than failing.
      if (!isOverloaded(err)) throw err
      console.warn('AI proxy: falling back to gemini-2.5-flash-lite')
      response = await ask('gemini-2.5-flash-lite')
    }

    const text = response.text ?? ''
    if (text) responseCache.set(cacheKey, { text, expiresAt: now + CACHE_TTL })
    return res.status(200).json({ text })
  } catch (err: any) {
    console.error('AI proxy error:', err)
    // Never leak the raw upstream error (it can contain quota/billing detail) — say something
    // a visitor can act on instead.
    if (isOverloaded(err)) {
      return res.status(429).json({ error: "The AI assistant is busy right now — please try again in a minute." })
    }
    if (String(err?.message) === 'timeout') {
      return res.status(504).json({ error: 'The AI assistant took too long to answer. Please try again.' })
    }
    return res.status(500).json({ error: 'The AI assistant is unavailable right now. Please try again shortly.' })
  }
}
