import { supabase } from './lib/supabase'
import { ContentStore, SectionDefinition, SectionStyleTokens, ImageSource } from './types'

export const SCHEMA_VERSION = '1.3.6'

const defaultStyle: SectionStyleTokens = {
  layoutVariant: 'default',
  surface: 'transparent',
  emphasis: 'normal',
  density: 'normal',
  width: 'standard',
  textAlign: 'left',
}

const wrapUrl = (url: string): ImageSource => ({ type: 'url', value: url })

const createDefaultSections = (content: string, videoUrl?: string): SectionDefinition[] => {
  const sections: SectionDefinition[] = []
  let order = 0
  if (videoUrl) {
    sections.push({ id: `vid-${Math.random().toString(36).substr(2, 9)}`, type: 'media_embed', enabled: true, order: order++, props: { url: videoUrl }, style: { ...defaultStyle, density: 'tight' } })
  }
  if (content) {
    sections.push({ id: `txt-${Math.random().toString(36).substr(2, 9)}`, type: 'rich_text', enabled: true, order: order++, props: { content }, style: { ...defaultStyle, density: 'normal' } })
  }
  return sections
}

export const DEFAULT_CONTENT: ContentStore = {
  schemaVersion: SCHEMA_VERSION,
  brand: {
    name: 'Mark SEF',
    identityLine: 'Connector · Architect · Builder · Full-Cycle Recruiter',
    positioning: 'I connect the right people fast.',
    operatorStatement: 'I approach recruiting as an operator — understanding the business, the hiring process, and how to use tools like AI to move roles forward and close the right hires.',
    heroImage: wrapUrl('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800&auto=format&fit=crop'),
    credibilityStrip: ['Niche & Specialised Roles', 'Global Teams', 'High‑Volume Environments', 'AI‑Enabled Recruiting Workflows'],
  },
  theme: {
    primaryColor: '#ffffff',
    backgroundColor: '#0a0a0a',
    surfaceColor: '#171717',
    textColor: '#f5f5f5',
    headingFont: 'Inter',
    bodyFont: 'Inter',
    cornerRadius: 'none',
    contrast: 10,
    fontSize: 16,
  },
  modules: {
    recruiting: { enabled: true, title: 'Recruiting', description: 'Strategic talent acquisition for high-growth teams.', content: 'I focus on full-cycle recruiting that prioritizes process efficiency and long-term retention.' },
    strategy: { enabled: true, title: 'Strategy', description: 'Systems thinking and operational leverage.', content: 'Recruiting is a systems problem. I help companies build the infrastructure for growth.' },
    community: {
      enabled: true,
      title: 'Community',
      description: 'A space for operators and builders.',
      content: 'Opportunity favors the prepared. We learn together, connect early, and help each other build careers.',
      ctaLabel: 'Join the Hub',
      joinDescription: 'Sign up for occasional updates on strategy and systems.',
      formFields: [
        { id: 'f1', label: 'Email Address', type: 'text', required: true, placeholder: 'operator@systems.com' },
        { id: 'f2', label: 'Primary Interest', type: 'radio', required: true, options: ['Recruiting', 'Systems', 'Advisory'] },
      ],
      members: [],
    },
    blog: {
      enabled: true,
      title: 'Blog',
      description: 'Strategic insights and technical briefings.',
      content: 'A repository of recruiting protocols and systems strategy.',
      posts: [
        {
          id: '1',
          title: 'The Full-Cycle Protocol',
          slug: 'full-cycle-protocol',
          date: '2024-05-20',
          excerpt: 'Deconstructing the recruitment lifecycle from sourcing to final close.',
          content: 'Recruiting is not a support function; it is a revenue-enabling operation.',
          author: 'Mark SEF',
          published: true,
          image: wrapUrl('https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop'),
          sections: createDefaultSections('Recruiting is not a support function; it is a revenue-enabling operation.'),
        },
      ],
    },
    podcast: {
      enabled: true,
      title: 'Podcast',
      description: 'Deep dives with builders and operators.',
      content: 'Conversations at the intersection of talent and technology.',
      episodes: [
        {
          id: 'p1',
          title: 'EP 01: Systems of Leverage',
          slug: 'systems-of-leverage',
          date: '2024-06-01',
          duration: '45:20',
          description: 'Exploring how top recruiters use AI to scale their output.',
          showNotes: 'In this inaugural episode, we break down the stack used by high-performance recruiting teams.',
          image: wrapUrl('https://images.unsplash.com/photo-1478737270239-2fccd8c7861b?q=80&w=800&auto=format&fit=crop'),
          mediaType: 'video',
          mediaUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
          platformLinks: { spotify: 'https://spotify.com', apple: 'https://podcasts.apple.com' },
          published: true,
          sections: createDefaultSections('In this inaugural episode, we break down the stack.', 'https://www.youtube.com/embed/dQw4w9WgXcQ'),
        },
      ],
    },
    video: { enabled: false, title: 'Video' },
    aiConcierge: {
      enabled: true,
      floatingChatEnabled: false,
      systemInstruction: 'You are the Mark SEF AI Concierge. Tone: Professional, direct, operator-style.',
      guardrails: "Never make promises on Mark's behalf.",
      knowledgeBase: 'Mark is a Full-Cycle Recruiter and Strategist.',
      voiceEnabled: false,
      welcomeMessage: 'Hello. I am the AI Concierge for Mark SEF. How can I assist you?',
      provider: 'google',
      model: 'gemini-2.5-flash',
      maxTokens: 2000,
      customModels: [],
      documents: [],
      history: [],
    },
  },
  navigation: [
    { label: 'Home', path: '/', visible: true },
    { label: 'About', path: '/about', visible: true },
    { label: 'Work', path: '/work', visible: true },
    { label: 'Blog', path: '/blog', visible: true },
    { label: 'Podcast', path: '/podcast', visible: true },
    { label: 'Community', path: '/community', visible: true },
    { label: 'Connect', path: '/connect', visible: true },
    { label: 'AI', path: '/ai', visible: true },
  ],
  pageLayouts: {
    home: {
      sections: [
        { id: 'h1', type: 'hero', enabled: true, order: 0, props: { title: 'Mark SEF', subtitle: 'Connector · Architect · Builder · Full-Cycle Recruiter', cta1Label: 'Explore Work', cta1Path: '/work', cta2Label: 'Read Blog', cta2Path: '/blog' }, style: { ...defaultStyle, textAlign: 'center', density: 'airy' } },
        { id: 'h2', type: 'logo_strip', enabled: true, order: 1, props: { label: 'Protocols', items: ['Niche Roles', 'Global Teams', 'AI Workflows'] }, style: { ...defaultStyle, surface: 'panel' } },
        { id: 'h3', type: 'grid_cards', enabled: true, order: 2, props: { title: 'Modules', items: [{ title: 'Recruiting', desc: 'Strategic talent acquisition.', link: '/work' }, { title: 'Strategy', desc: 'Systems thinking.', link: '/work' }, { title: 'Blog', desc: 'Technical briefings.', link: '/blog' }] }, style: defaultStyle },
      ],
    },
    work: {
      sections: [
        { id: 'w1', type: 'rich_text', enabled: true, order: 0, props: { title: 'Work & Systems', content: 'Explore how I approach recruiting as an operator.' }, style: { ...defaultStyle, density: 'airy', textAlign: 'center' } },
        { id: 'w2', type: 'split', enabled: true, order: 1, props: { title: 'Recruiting', body: 'Strategic talent acquisition for high-growth teams.', image: wrapUrl('https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=800&auto=format&fit=crop') }, style: defaultStyle },
        { id: 'w3', type: 'split', enabled: true, order: 2, props: { title: 'Strategy', body: 'Systems thinking and operational leverage.', image: wrapUrl('https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop') }, style: { ...defaultStyle, layoutVariant: 'reversed' } },
      ],
    },
    about: {
      sections: [
        { id: 'a1', type: 'split', enabled: true, order: 0, props: { title: 'The Operator Approach', body: 'I approach recruiting by understanding the business mechanics first.', image: wrapUrl('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800&auto=format&fit=crop') }, style: { ...defaultStyle, mediaAspect: 'portrait' } },
        { id: 'a2', type: 'grid_cards', enabled: true, order: 1, props: { title: 'Core Principles', items: [{ title: 'Process', desc: 'Process over Hype.' }, { title: 'Leverage', desc: 'Systems-driven growth.' }, { title: 'Integrity', desc: 'The right close, every time.' }] }, style: { ...defaultStyle, surface: 'panel' } },
      ],
    },
    community: {
      sections: [
        { id: 'c1', type: 'rich_text', enabled: true, order: 0, props: { title: 'Community', content: 'A space for operators and builders.' }, style: { ...defaultStyle, textAlign: 'center', density: 'airy' } },
        { id: 'c2', type: 'community_form', enabled: true, order: 1, props: { title: 'Join the Hub', subtitle: 'Sign up for strategy updates.' }, style: defaultStyle },
      ],
    },
    connect: {
      sections: [
        { id: 'co1', type: 'rich_text', enabled: true, order: 0, props: { title: 'Connect', content: 'Currently accepting inquiries for high-growth leadership roles and advisory projects.' }, style: { ...defaultStyle, textAlign: 'center', density: 'airy' } },
        { id: 'co2', type: 'contact_methods', enabled: true, order: 1, props: {}, style: defaultStyle },
      ],
    },
    ai: {
      sections: [
        { id: 'ai1', type: 'rich_text', enabled: true, order: 0, props: { title: 'AI Concierge', content: "OPERATOR LEVERAGE MODE ENABLED. This concierge is trained on Mark SEF's recruitment and strategy methodologies." }, style: { ...defaultStyle, textAlign: 'center' } },
        { id: 'ai2', type: 'ai_chat', enabled: true, order: 1, props: {}, style: defaultStyle },
      ],
    },
    blog: { sections: [] },
    podcast: { sections: [] },
    video: { sections: [] },
  },
}

export const getStore = async (): Promise<ContentStore> => {
  if (!supabase) return DEFAULT_CONTENT
  try {
    const { data, error } = await supabase
      .from('hub_settings')
      .select('content')
      .eq('id', 1)
      .single()
    if (error || !data?.content || Object.keys(data.content).length === 0) return DEFAULT_CONTENT
    return { ...DEFAULT_CONTENT, ...data.content }
  } catch {
    return DEFAULT_CONTENT
  }
}

export const saveStore = async (store: ContentStore): Promise<void> => {
  if (!supabase) throw new Error('Supabase not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  const { error } = await supabase
    .from('hub_settings')
    .upsert({ id: 1, content: store, updated_at: new Date().toISOString() })
  if (error) throw new Error(error.message)
}
