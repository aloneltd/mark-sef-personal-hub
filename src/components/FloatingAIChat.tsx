import React, { useState, useRef, useEffect } from 'react'
import { ContentStore, Message } from '../types'
import { getAIResponse } from '../services/ai'

interface FloatingAIChatProps {
  store: ContentStore
  onUpdate: (newStore: ContentStore) => void
}

const FloatingAIChat: React.FC<FloatingAIChatProps> = ({ store, onUpdate }) => {
  const config = store.modules.aiConcierge
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const messages: Message[] = config.history && config.history.length > 0
    ? config.history
    : [{ role: 'model', text: config.welcomeMessage }]

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isOpen, isLoading])

  const updateHistory = (newHistory: Message[]) => {
    onUpdate({ ...store, modules: { ...store.modules, aiConcierge: { ...config, history: newHistory } } })
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    const userMessage: Message = { role: 'user', text: input }
    const newHistory = [...messages, userMessage]
    updateHistory(newHistory)
    setInput('')
    setIsLoading(true)
    const responseText = await getAIResponse(newHistory, config)
    updateHistory([...newHistory, { role: 'model', text: responseText }])
    setIsLoading(false)
  }

  const handleClear = () => {
    if (confirm('Clear conversation history?')) {
      updateHistory([{ role: 'model', text: config.welcomeMessage }])
    }
  }

  if (!config.floatingChatEnabled) return null

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end pointer-events-auto">
      {isOpen && (
        <div className="mb-4 w-80 md:w-96 bg-[#0f0f0f] border border-white/10 rounded-sm shadow-2xl flex flex-col overflow-hidden animate-in">
          <div className="p-3 border-b border-white/5 bg-neutral-900 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] mono uppercase tracking-widest text-neutral-300">AI Protocol</span>
            </div>
            <button onClick={handleClear} className="text-[9px] mono text-neutral-500 hover:text-white uppercase">Reset</button>
          </div>
          <div ref={scrollRef} className="h-80 overflow-y-auto p-4 space-y-4 bg-[#0a0a0a]">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-sm text-xs leading-relaxed ${m.role === 'user' ? 'bg-white text-black font-medium' : 'bg-neutral-900 border border-white/10 text-neutral-300'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-neutral-900 border border-white/10 px-3 py-2 rounded-sm">
                  <div className="flex gap-1">
                    <span className="w-1 h-1 bg-neutral-500 rounded-full animate-bounce" />
                    <span className="w-1 h-1 bg-neutral-500 rounded-full animate-bounce delay-100" />
                    <span className="w-1 h-1 bg-neutral-500 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
          </div>
          <form onSubmit={handleSend} className="p-3 border-t border-white/5 bg-neutral-900">
            <div className="flex gap-2">
              <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Query..." className="flex-grow bg-black border border-white/10 p-2 text-xs text-white outline-none focus:border-white/30" disabled={isLoading} />
              <button type="submit" disabled={isLoading || !input.trim()} className="px-3 bg-white text-black text-[10px] uppercase font-bold hover:bg-neutral-200 disabled:opacity-50">Send</button>
            </div>
          </form>
        </div>
      )}
      <button onClick={() => setIsOpen(!isOpen)} className="w-12 h-12 bg-white text-black rounded-full shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] flex items-center justify-center transition-all hover:scale-105">
        {isOpen ? <span className="text-xl font-bold">×</span> : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
        )}
      </button>
    </div>
  )
}

export default FloatingAIChat
