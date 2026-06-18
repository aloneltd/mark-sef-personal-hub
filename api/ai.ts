import { GoogleGenAI } from '@google/genai'
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { messages, systemInstruction, useSearch = false, temperature = 0.7 } = req.body
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' })
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

  try {
    const config: Record<string, unknown> = {
      systemInstruction: systemInstruction || undefined,
      temperature,
      maxOutputTokens: 2048,
    }
    if (useSearch) config.tools = [{ googleSearch: {} }]

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: messages.map((m: { role: string; text: string }) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      })),
      config,
    })

    return res.status(200).json({ text: response.text ?? '' })
  } catch (err: any) {
    console.error('AI proxy error:', err)
    return res.status(500).json({ error: err.message ?? 'AI request failed' })
  }
}
