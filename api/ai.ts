import { GoogleGenAI } from '@google/genai'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { PRIMARY_MODEL, getFallbackModels, isOverloaded, isModelUnavailable, markModelBroken } from './_lib/gemini-models.js'

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
      response = await ask(PRIMARY_MODEL)
    } catch (primaryErr: any) {
      // Rate limited or busy — drop to a lighter model rather than failing.
      if (!isOverloaded(primaryErr)) throw primaryErr
      const candidates = await getFallbackModels()
      if (candidates.length === 0) throw primaryErr
      // Try up to 2 candidates: a listed model can still 404 as "no longer available to new
      // users" (a real prod case — ListModels doesn't reflect that restriction). When that
      // happens, blacklist the id so later requests skip it, and try the next candidate
      // instead of giving up on the whole request.
      let gotResponse = false
      for (const fallback of candidates.slice(0, 2)) {
        console.warn(`AI proxy: ${PRIMARY_MODEL} unavailable, trying fallback ${fallback}`)
        try {
          response = await ask(fallback)
          gotResponse = true
          break
        } catch (fallbackErr: any) {
          console.error(`AI proxy: fallback ${fallback} failed:`, fallbackErr?.message)
          if (isModelUnavailable(fallbackErr)) markModelBroken(fallback)
        }
      }
      // The visitor's problem is the PRIMARY failure (we're rate limited); a broken
      // fallback must not turn that into a misleading generic error.
      if (!gotResponse) throw primaryErr
    }

    // Every path above either assigns response or throws, so it's always set here.
    const text = response!.text ?? ''
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
