import { Message } from '../types'

// The server has its own 15s timeout against Gemini (see api/ai.ts), but that only helps once
// the request actually reaches the function. A stalled connection (flaky network, a hung edge
// hop) never reaches the server at all, and fetch() has no timeout of its own — without this,
// the chat UI would spin on "Generating response..." forever. This guarantees a resolution.
const CLIENT_TIMEOUT_MS = 20_000

export async function getAIResponse(
  history: Message[],
  config: { systemInstruction: string; guardrails: string; knowledgeBase: string; welcomeMessage: string }
): Promise<string> {
  const systemInstruction = `${config.systemInstruction}\n\nGUARDRAILS:\n${config.guardrails}\n\nKNOWLEDGE BASE:\n${config.knowledgeBase}\n\nTone: Professional, direct, operator-style.`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS)
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history, systemInstruction, useSearch: false }),
      signal: controller.signal,
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({} as { error?: string }))
      return body.error || 'An error occurred while communicating with the AI Concierge.'
    }
    const data = await res.json()
    return data.text ?? "I'm sorry, I couldn't generate a response."
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return 'The AI assistant is taking too long to respond. Please try again.'
    }
    return 'An error occurred while communicating with the AI Concierge.'
  } finally {
    clearTimeout(timer)
  }
}
