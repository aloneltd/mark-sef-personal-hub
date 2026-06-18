import React, { useState, useRef, useEffect } from 'react'
import { SectionDefinition, Message, FormField, CommunityConfig, CommunityMember } from '../../types'
import { getAIResponse } from '../../services/ai'
import { SectionWrapper, ContentBox, getWidthClass, getPaddingClass, getSurfaceClass } from './CoreSections'

export const AIChatSection: React.FC<{ section: SectionDefinition; aiConfig: any }> = ({ section, aiConfig }) => {
  const [messages, setMessages] = useState<Message[]>([{ role: 'model', text: aiConfig.welcomeMessage }])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { style = {} as any } = section

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, isLoading])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    const userMessage: Message = { role: 'user', text: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    const responseText = await getAIResponse([...messages, userMessage], aiConfig)
    setMessages(prev => [...prev, { role: 'model', text: responseText }])
    setIsLoading(false)
  }

  return (
    <SectionWrapper section={section} className={`${getPaddingClass(style.density)} ${getSurfaceClass(style.surface)}`}>
      <ContentBox section={section} className={getWidthClass(style.width)}>
        <div className="p-4 md:p-8">
          <div className="max-w-4xl mx-auto flex flex-col h-[600px] border border-white/5 bg-neutral-900/20 rounded-sm">
            <div ref={scrollRef} className="flex-grow overflow-y-auto space-y-6 p-6 border-b border-white/5">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-5 py-3 rounded-sm text-sm leading-relaxed ${m.role === 'user' ? 'bg-white text-black font-medium' : 'bg-neutral-900 border border-white/5 text-neutral-300'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {isLoading && <div className="text-xs text-neutral-500 animate-pulse">Generating response...</div>}
            </div>
            <form onSubmit={handleSend} className="p-4 flex gap-2">
              <input type="text" placeholder="Ask about recruiting or strategy..." className="flex-grow bg-black border border-white/10 px-4 py-3 rounded-sm outline-none focus:border-white/30 text-sm" value={input} onChange={e => setInput(e.target.value)} disabled={isLoading} />
              <button type="submit" className="bg-white text-black font-bold px-6 py-3 rounded-sm hover:bg-neutral-200 transition-colors disabled:opacity-50" disabled={isLoading}>Send</button>
            </form>
          </div>
        </div>
      </ContentBox>
    </SectionWrapper>
  )
}

export const CommunityFormSection: React.FC<{ section: SectionDefinition; communityConfig: CommunityConfig }> = ({ section, communityConfig }) => {
  const { props, style = {} as any } = section
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    const emailField = (communityConfig.formFields || []).find(f => f.label.toLowerCase().includes('email'))
    const email = emailField ? formData[emailField.id] : ''
    if (!email) {
      setError('Please enter your email address.')
      setIsSubmitting(false)
      return
    }
    try {
      const res = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fields: formData }),
      })
      if (!res.ok) throw new Error('submission failed')
      setSubmitted(true)
    } catch {
      setError('Submission failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <SectionWrapper section={section} className={`${getPaddingClass(style.density)} ${getSurfaceClass(style.surface)}`}>
        <ContentBox section={section} className={`${getWidthClass(style.width)} text-center`}>
          <div className="p-8 md:p-16">
            <div className="text-white text-5xl mb-8">✓</div>
            <h3 className="text-2xl font-bold mb-4">Protocol Confirmed.</h3>
            <p className="text-neutral-500">You're now part of the operator network.</p>
          </div>
        </ContentBox>
      </SectionWrapper>
    )
  }

  return (
    <SectionWrapper section={section} className={`${getPaddingClass(style.density)} ${getSurfaceClass(style.surface)}`}>
      <ContentBox section={section} className={getWidthClass(style.width)}>
        <div className="p-4 md:p-8 max-w-2xl mx-auto">
          <h3 className="text-2xl font-bold mb-2 italic">{props.title}</h3>
          <p className="text-neutral-500 mb-10">{props.subtitle}</p>
          <form onSubmit={handleSubmit} className="space-y-6">
            {(communityConfig.formFields || []).map((field: FormField) => (
              <div key={field.id} className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 mono">{field.label}{field.required && ' *'}</label>
                {field.type === 'text' && (
                  <input type="text" required={field.required} placeholder={field.placeholder} className="w-full bg-black border border-white/10 p-3 text-sm focus:border-white/30 outline-none" value={formData[field.id] || ''} onChange={e => handleInputChange(field.id, e.target.value)} />
                )}
                {field.type === 'textarea' && (
                  <textarea required={field.required} placeholder={field.placeholder} className="w-full bg-black border border-white/10 p-3 text-sm h-24 focus:border-white/30 outline-none" value={formData[field.id] || ''} onChange={e => handleInputChange(field.id, e.target.value)} />
                )}
                {field.type === 'radio' && (
                  <div className="flex flex-wrap gap-4">
                    {(field.options || []).map((opt: string) => (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="radio" name={field.id} value={opt} required={field.required} onChange={() => handleInputChange(field.id, opt)} className="accent-white" />
                        {opt}
                      </label>
                    ))}
                  </div>
                )}
                {field.type === 'select' && (
                  <select required={field.required} className="w-full bg-black border border-white/10 p-3 text-sm outline-none" value={formData[field.id] || ''} onChange={e => handleInputChange(field.id, e.target.value)}>
                    <option value="">Select...</option>
                    {(field.options || []).map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                )}
              </div>
            ))}
            {error && <p className="text-red-400 text-xs mono">{error}</p>}
            <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-white text-black font-bold uppercase tracking-widest text-xs hover:bg-neutral-200 transition-colors disabled:opacity-50">
              {isSubmitting ? 'Submitting...' : communityConfig.ctaLabel || 'Join the Hub'}
            </button>
          </form>
        </div>
      </ContentBox>
    </SectionWrapper>
  )
}

export const ContactMethodsSection: React.FC<{ section: SectionDefinition }> = ({ section }) => {
  const { style = {} as any } = section
  return (
    <SectionWrapper section={section} className={`${getPaddingClass(style.density)} ${getSurfaceClass(style.surface)}`}>
      <ContentBox section={section} className={getWidthClass(style.width)}>
        <div className="p-4 md:p-8 grid md:grid-cols-3 gap-8">
          {[
            { label: 'Email', value: 'm@alone.ltd', href: 'mailto:m@alone.ltd' },
            { label: 'LinkedIn', value: 'Connect professionally', href: 'https://linkedin.com' },
            { label: 'Protocol', value: 'Submit an inquiry', href: '#community' },
          ].map(c => (
            <a key={c.label} href={c.href} className="p-8 border border-white/5 hover:border-white/20 bg-neutral-900/20 group transition-all block">
              <span className="text-[9px] mono uppercase tracking-[0.3em] text-neutral-600 block mb-2">{c.label}</span>
              <span className="text-sm font-medium group-hover:text-white text-neutral-300 transition-colors">{c.value}</span>
            </a>
          ))}
        </div>
      </ContentBox>
    </SectionWrapper>
  )
}
