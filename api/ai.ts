import { GoogleGenAI } from '@google/genai'
import type { VercelRequest, VercelResponse } from '@vercel/node'

// Module-level: allocated once per warm serverless instance
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

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

  try {
    const config: Record<string, unknown> = {
      systemInstruction: systemInstruction || undefined,
      temperature,
      maxOutputTokens: 2048,
    }
    if (useSearch) config.tools = [{ googleSearch: {} }]

    const response = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: messages.slice(-10).map((m: { role: string; text: string }) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }],
        })),
        config,
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000)),
    ])

    return res.status(200).json({ text: response.text ?? '' })
  } catch (err: any) {
    console.error('AI proxy error:', err)
    return res.status(500).json({ error: err.message ?? 'AI request failed' })
  }
}
