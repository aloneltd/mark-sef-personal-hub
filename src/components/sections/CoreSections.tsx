import React from 'react'
import { SectionDefinition } from '../../types'
import { Link } from 'react-router-dom'

export const resolveImage = (source: any): string => {
  if (!source) return ''
  if (typeof source === 'string') return source
  if (source.value) return source.value
  return ''
}

export const SectionWrapper: React.FC<{ section: SectionDefinition; children: React.ReactNode; className?: string }> = ({ section, children, className = '' }) => {
  const bgImage = resolveImage(section.props?.backgroundImage)
  const opacity = section.props?.overlayOpacity !== undefined ? section.props.overlayOpacity / 100 : 0
  return (
    <section className={`relative w-full ${className}`}>
      {bgImage && (
        <div className="absolute inset-0 z-0">
          <img src={bgImage} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${opacity})` }} />
        </div>
      )}
      <div className="relative z-10 w-full h-full">{children}</div>
    </section>
  )
}

export const ContentBox: React.FC<{ section: SectionDefinition; children: React.ReactNode; className?: string }> = ({ section, children, className = '' }) => {
  const bgImage = resolveImage(section.props?.contentBackgroundImage)
  const opacity = section.props?.contentBackgroundOpacity !== undefined ? section.props.contentBackgroundOpacity / 100 : 1
  if (!bgImage) return <div className={`relative ${className}`}>{children}</div>
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 z-0 rounded-sm overflow-hidden pointer-events-none">
        <img src={bgImage} alt="" className="w-full h-full object-cover" style={{ opacity }} />
      </div>
      <div className="relative z-10 h-full">{children}</div>
    </div>
  )
}

export const getSurfaceClass = (surface?: string) => {
  if (surface === 'panel') return 'bg-neutral-900/50 border border-white/5'
  if (surface === 'card') return 'bg-neutral-800/40 border border-white/10 shadow-xl'
  return ''
}

export const getPaddingClass = (density?: string) => {
  if (density === 'tight') return 'py-8 px-6'
  if (density === 'airy') return 'py-32 px-6'
  return 'py-20 px-6'
}

export const getWidthClass = (width?: string) => {
  if (width === 'wide') return 'max-w-7xl mx-auto'
  return 'max-w-5xl mx-auto'
}

export const getEmphasisClass = (emphasis?: string) => {
  if (emphasis === 'highlight') return 'border-l-4 border-white pl-8 md:pl-12'
  return ''
}

export const HeroSection: React.FC<{ section: SectionDefinition }> = ({ section }) => {
  const { props, style = {} as any } = section
  return (
    <SectionWrapper section={section} className={`overflow-hidden ${getPaddingClass(style.density)} ${getSurfaceClass(style.surface)}`}>
      <ContentBox section={section} className={`${getWidthClass(style.width)} text-${style.textAlign || 'left'}`}>
        <div className="p-4 md:p-8">
          <h1 className="text-5xl md:text-8xl font-bold tracking-tight mb-6 animate-in italic">{props.title}</h1>
          <p className="text-xl md:text-2xl text-neutral-400 font-light mb-10 max-w-3xl mx-auto leading-relaxed">{props.subtitle}</p>
          <div className={`flex flex-col md:flex-row gap-4 justify-${style.textAlign === 'center' ? 'center' : style.textAlign === 'right' ? 'end' : 'start'}`}>
            {props.cta1Label && <Link to={props.cta1Path} className="px-8 py-4 bg-white text-black font-bold rounded-sm hover:bg-neutral-200 transition-colors uppercase text-xs tracking-widest">{props.cta1Label}</Link>}
            {props.cta2Label && <Link to={props.cta2Path} className="px-8 py-4 border border-white/20 hover:border-white text-white font-bold rounded-sm transition-colors uppercase text-xs tracking-widest">{props.cta2Label}</Link>}
          </div>
        </div>
      </ContentBox>
    </SectionWrapper>
  )
}

export const SplitSection: React.FC<{ section: SectionDefinition }> = ({ section }) => {
  const { props, style = {} as any } = section
  const isReversed = style.layoutVariant === 'reversed'
  const mainImage = resolveImage(props.image)
  const hoverImage = resolveImage(props.hoverImage)
  const aspect = style.mediaAspect || 'video'
  let aspectClass = 'aspect-video'
  if (aspect === 'square') aspectClass = 'aspect-square'
  if (aspect === 'portrait') aspectClass = 'aspect-[3/4]'
  if (aspect === 'landscape') aspectClass = 'aspect-[4/3]'
  const isOriginal = aspect === 'original'
  return (
    <SectionWrapper section={section} className={`${getPaddingClass(style.density)} ${getSurfaceClass(style.surface)}`}>
      <ContentBox section={section} className={getWidthClass(style.width)}>
        <div className="grid md:grid-cols-2 gap-16 items-center p-4 md:p-8">
          <div className={`${isReversed ? 'md:order-2' : ''} space-y-6 text-${style.textAlign || 'left'} ${getEmphasisClass(style.emphasis)}`}>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight italic underline decoration-white/20">{props.title}</h2>
            <div className="text-neutral-400 text-lg leading-relaxed whitespace-pre-line font-light">{props.body}</div>
          </div>
          <div className={`${isReversed ? 'md:order-1' : ''} ${!isOriginal ? `${aspectClass} relative` : 'relative'} overflow-hidden rounded-sm border border-white/5 grayscale hover:grayscale-0 transition-all duration-1000 group`}>
            {mainImage && <img src={mainImage} alt={props.title} className={`w-full ${!isOriginal ? 'h-full absolute inset-0 object-cover' : 'h-auto relative block'}`} />}
            {hoverImage && <img src={hoverImage} alt={props.title} className={`w-full ${!isOriginal ? 'h-full absolute inset-0 object-cover' : 'h-auto absolute inset-0 object-cover'} z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />}
          </div>
        </div>
      </ContentBox>
    </SectionWrapper>
  )
}

export const GridSection: React.FC<{ section: SectionDefinition }> = ({ section }) => {
  const { props, style = {} as any } = section
  return (
    <SectionWrapper section={section} className={`${getPaddingClass(style.density)} ${getSurfaceClass(style.surface)}`}>
      <ContentBox section={section} className={getWidthClass(style.width)}>
        <div className="p-4 md:p-8">
          {props.title && <h2 className="text-sm uppercase tracking-[0.4em] text-neutral-500 mb-16 mono text-center">{props.title}</h2>}
          <div className="grid md:grid-cols-3 gap-8">
            {(props.items || []).map((item: any, idx: number) => (
              <div key={idx} className="p-10 rounded-sm transition-all border border-white/5 hover:border-white/30 bg-neutral-900/40 group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-0 bg-white group-hover:h-full transition-all duration-500 z-10" />
                <h3 className="text-xl font-bold mb-4 italic relative z-10">{item.title}</h3>
                <p className="text-neutral-500 text-sm leading-relaxed mb-8 relative z-10">{item.desc}</p>
                {item.link && <Link to={item.link} className="text-[10px] uppercase tracking-widest text-neutral-400 group-hover:text-white transition-colors border-b border-white/10 pb-1 relative z-10">Explore Protocol →</Link>}
              </div>
            ))}
          </div>
        </div>
      </ContentBox>
    </SectionWrapper>
  )
}

export const TestimonialsSection: React.FC<{ section: SectionDefinition }> = ({ section }) => {
  const { props, style = {} as any } = section
  return (
    <SectionWrapper section={section} className={`${getPaddingClass(style.density)} ${getSurfaceClass(style.surface)}`}>
      <ContentBox section={section} className={getWidthClass(style.width)}>
        <div className="grid md:grid-cols-2 gap-12 p-4 md:p-8">
          {(props.items || []).map((item: any, idx: number) => (
            <div key={idx} className="p-8 border-l border-white/10 bg-neutral-900/20 italic text-neutral-300">
              <p className="text-lg mb-6 leading-relaxed">"{item.quote}"</p>
              <div className="not-italic">
                <span className="block font-bold uppercase tracking-widest text-xs">{item.author}</span>
                <span className="text-[10px] mono text-neutral-600 uppercase">{item.role}</span>
              </div>
            </div>
          ))}
        </div>
      </ContentBox>
    </SectionWrapper>
  )
}

export const CTASection: React.FC<{ section: SectionDefinition }> = ({ section }) => {
  const { props, style = {} as any } = section
  return (
    <SectionWrapper section={section} className={`${getPaddingClass(style.density)} ${getSurfaceClass(style.surface)} text-center`}>
      <ContentBox section={section} className={getWidthClass(style.width)}>
        <div className="border-y border-white/10 py-16 p-4 md:p-8">
          <h2 className="text-4xl md:text-6xl font-bold mb-8 italic">{props.title}</h2>
          <Link to={props.link} className="inline-block px-12 py-5 bg-white text-black font-bold uppercase tracking-widest text-sm hover:bg-neutral-200 transition-all">{props.label}</Link>
        </div>
      </ContentBox>
    </SectionWrapper>
  )
}

export const TimelineSection: React.FC<{ section: SectionDefinition }> = ({ section }) => {
  const { props, style = {} as any } = section
  return (
    <SectionWrapper section={section} className={`${getPaddingClass(style.density)} ${getSurfaceClass(style.surface)}`}>
      <ContentBox section={section} className={getWidthClass(style.width)}>
        <div className="space-y-12 p-4 md:p-8">
          {(props.items || []).map((item: any, idx: number) => (
            <div key={idx} className="grid md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-3 text-sm mono text-neutral-600 uppercase tracking-[0.3em]">{item.date}</div>
              <div className="md:col-span-9 border-l border-white/10 pl-8 space-y-2">
                <h4 className="text-xl font-bold italic">{item.title}</h4>
                <p className="text-neutral-500 leading-relaxed font-light">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </ContentBox>
    </SectionWrapper>
  )
}

export const MediaEmbedSection: React.FC<{ section: SectionDefinition }> = ({ section }) => {
  const { props, style = {} as any } = section
  return (
    <SectionWrapper section={section} className={`${getPaddingClass(style.density)} ${getSurfaceClass(style.surface)}`}>
      <ContentBox section={section} className={getWidthClass(style.width)}>
        <div className="aspect-video overflow-hidden border border-white/10 rounded-sm bg-black group">
          <iframe src={props.url} className="w-full h-full grayscale group-hover:grayscale-0 transition-all duration-700" frameBorder="0" allowFullScreen title="Media Embed" />
        </div>
      </ContentBox>
    </SectionWrapper>
  )
}

export const LogoStripSection: React.FC<{ section: SectionDefinition }> = ({ section }) => {
  const { props, style = {} as any } = section
  return (
    <SectionWrapper section={section} className={`py-12 border-y border-white/5 ${getSurfaceClass(style.surface)}`}>
      <ContentBox section={section} className={getWidthClass(style.width)}>
        <div className="flex flex-wrap justify-center md:justify-between gap-12 items-center opacity-40 hover:opacity-100 transition-opacity duration-700 p-4">
          {(props.items || []).map((item: string, idx: number) => (
            <div key={idx} className="text-center group">
              <span className="text-[9px] uppercase tracking-[0.4em] text-neutral-600 block mb-1 mono group-hover:text-white transition-colors">{props.label || 'PROTOCOL'}</span>
              <p className="text-sm font-bold text-neutral-300 uppercase tracking-[0.2em]">{item}</p>
            </div>
          ))}
        </div>
      </ContentBox>
    </SectionWrapper>
  )
}

export const RichTextSection: React.FC<{ section: SectionDefinition }> = ({ section }) => {
  const { props, style = {} as any } = section
  return (
    <SectionWrapper section={section} className={`${getPaddingClass(style.density)} ${getSurfaceClass(style.surface)}`}>
      <ContentBox section={section} className={`${getWidthClass(style.width)} text-${style.textAlign || 'left'}`}>
        <div className={`p-4 md:p-8 ${getEmphasisClass(style.emphasis)}`}>
          {props.title && <h2 className="text-4xl md:text-5xl font-bold mb-12 tracking-tight italic underline decoration-white/10">{props.title}</h2>}
          <div className="prose prose-invert prose-lg max-w-none text-neutral-400 leading-relaxed whitespace-pre-line font-light">{props.content}</div>
        </div>
      </ContentBox>
    </SectionWrapper>
  )
}
