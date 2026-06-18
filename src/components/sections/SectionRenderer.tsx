import React from 'react'
import { SectionDefinition, ContentStore, ImageSource } from '../../types'
import { HeroSection, SplitSection, GridSection, LogoStripSection, RichTextSection, CTASection, TimelineSection, MediaEmbedSection, TestimonialsSection } from './CoreSections'
import { AIChatSection, CommunityFormSection, ContactMethodsSection } from './FeatureSections'

interface SectionRendererProps {
  section: SectionDefinition
  store: ContentStore
}

const resolveImage = (source: any): string => {
  if (!source) return ''
  if (typeof source === 'string') return source
  const src = source as ImageSource
  if (src.type === 'url' || src.type === 'upload' || src.type === 'drive') return src.value
  return ''
}

const SectionRenderer: React.FC<SectionRendererProps> = ({ section, store }) => {
  if (!section.enabled) return null

  const resolvedProps = { ...section.props }
  if (resolvedProps.image) resolvedProps.image = resolveImage(resolvedProps.image)
  if (resolvedProps.backgroundImage) resolvedProps.backgroundImage = resolveImage(resolvedProps.backgroundImage)
  if (resolvedProps.contentBackgroundImage) resolvedProps.contentBackgroundImage = resolveImage(resolvedProps.contentBackgroundImage)
  if (resolvedProps.hoverImage) resolvedProps.hoverImage = resolveImage(resolvedProps.hoverImage)
  if (resolvedProps.avatar) resolvedProps.avatar = resolveImage(resolvedProps.avatar)
  if (Array.isArray(resolvedProps.items)) {
    resolvedProps.items = resolvedProps.items.map((item: any) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        return { ...item, image: item.image ? resolveImage(item.image) : undefined, hoverImage: item.hoverImage ? resolveImage(item.hoverImage) : undefined, avatar: item.avatar ? resolveImage(item.avatar) : undefined }
      }
      return item
    })
  }

  const resolvedSection = { ...section, props: resolvedProps }

  switch (section.type) {
    case 'hero': return <HeroSection section={resolvedSection} />
    case 'split': return <SplitSection section={resolvedSection} />
    case 'grid_cards': return <GridSection section={resolvedSection} />
    case 'logo_strip': return <LogoStripSection section={resolvedSection} />
    case 'rich_text': return <RichTextSection section={resolvedSection} />
    case 'cta': return <CTASection section={resolvedSection} />
    case 'timeline': return <TimelineSection section={resolvedSection} />
    case 'media_embed': return <MediaEmbedSection section={resolvedSection} />
    case 'testimonials': return <TestimonialsSection section={resolvedSection} />
    case 'ai_chat': return <AIChatSection section={resolvedSection} aiConfig={store.modules.aiConcierge} />
    case 'community_form': return <CommunityFormSection section={resolvedSection} communityConfig={store.modules.community} />
    case 'contact_methods': return <ContactMethodsSection section={resolvedSection} />
    default: return (
      <div className="p-20 text-center text-neutral-700 border border-dashed border-white/5 bg-neutral-900/10 mono text-xs uppercase tracking-widest">
        Protocol Component Unknown: {section.type}
      </div>
    )
  }
}

export default SectionRenderer
