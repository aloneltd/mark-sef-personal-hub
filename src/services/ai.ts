import { Message } from '../types'

export async function getAIResponse(
  history: Message[],
  config: { systemInstruction: string; guardrails: string; knowledgeBase: string; welcomeMessage: string }
): Promise<string> {
  const systemInstruction = `${config.systemInstruction}\n\nGUARDRAILS:\n${config.guardrails}\n\nKNOWLEDGE BASE:\n${config.knowledgeBase}\n\nTone: Professional, direct, operator-style.`
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history, systemInstruction, useSearch: false }),
    })
    if (!res.ok) throw new Error('proxy error')
    const data = await res.json()
    return data.text ?? "I'm sorry, I couldn't generate a response."
  } catch {
    return 'An error occurred while communicating with the AI Concierge.'
  }
}
