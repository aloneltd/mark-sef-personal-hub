import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { ContentStore, ImageSource } from '../types'
import SectionRenderer from '../components/sections/SectionRenderer'

interface PodcastProps {
  store: ContentStore
  previewSlug?: string
}

const resolveImage = (source: any): string => {
  if (!source) return ''
  if (typeof source === 'string') return source
  const src = source as ImageSource
  if (src.type === 'url' || src.type === 'upload' || src.type === 'drive') return src.value
  return ''
}

const Podcast: React.FC<PodcastProps> = ({ store, previewSlug }) => {
  const { slug } = useParams<{ slug?: string }>()
  const podcastConfig = store.modules.podcast
  const episodes = podcastConfig.episodes || []
  const activeSlug = previewSlug || slug

  if (!podcastConfig.enabled) {
    return <div className="min-h-[60vh] flex items-center justify-center text-neutral-600 mono text-xs uppercase tracking-[0.3em]">Podcast Protocol Offline</div>
  }

  if (activeSlug) {
    const episode = episodes.find(e => e.slug === activeSlug)
    if (!episode) return <div className="p-20 text-center uppercase mono text-xs">Episode Not Found</div>
    const sections = (episode.sections || []).sort((a, b) => a.order - b.order)
    return (
      <div className="animate-in pb-20">
        <header className="bg-neutral-900/30 border-b border-white/5 py-12 px-6">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-12 items-center">
            <div className="w-full md:w-1/3 aspect-square overflow-hidden border border-white/10 rounded-sm grayscale hover:grayscale-0 transition-all duration-700">
              <img src={resolveImage(episode.image)} alt={episode.title} className="w-full h-full object-cover" />
            </div>
            <div className="flex-grow space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-[10px] mono text-neutral-500 uppercase tracking-widest">{episode.date}</span>
                <span className="px-2 py-0.5 bg-white/5 text-neutral-400 text-[9px] mono uppercase border border-white/10">{episode.duration}</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold italic tracking-tight">{episode.title}</h1>
              <p className="text-neutral-400 text-lg font-light leading-relaxed">{episode.description}</p>
              <div className="flex flex-wrap gap-4 pt-4">
                {episode.platformLinks.spotify && <a href={episode.platformLinks.spotify} target="_blank" rel="noopener noreferrer" className="px-4 py-2 border border-white/10 hover:border-white text-[10px] mono uppercase tracking-widest transition-all">Spotify</a>}
                {episode.platformLinks.apple && <a href={episode.platformLinks.apple} target="_blank" rel="noopener noreferrer" className="px-4 py-2 border border-white/10 hover:border-white text-[10px] mono uppercase tracking-widest transition-all">Apple</a>}
                {episode.platformLinks.rss && <a href={episode.platformLinks.rss} target="_blank" rel="noopener noreferrer" className="px-4 py-2 border border-white/10 hover:border-white text-[10px] mono uppercase tracking-widest transition-all">RSS</a>}
              </div>
            </div>
          </div>
        </header>
        <section className="max-w-5xl mx-auto px-6 py-12">
          {sections.length > 0 ? sections.map(section => <SectionRenderer key={section.id} section={section} store={store} />) : (
            <div className="prose prose-invert prose-lg text-neutral-400 font-light leading-relaxed whitespace-pre-line">{episode.showNotes}</div>
          )}
          <div className="mt-20 pt-12 border-t border-white/5">
            <Link to="/podcast" className="block text-center px-6 py-3 border border-white/10 hover:border-white text-[10px] mono uppercase tracking-widest transition-all max-w-xs mx-auto">← Back to Catalog</Link>
          </div>
        </section>
      </div>
    )
  }

  const sortedEpisodes = episodes.filter(e => e.published).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  return (
    <div className="max-w-6xl mx-auto px-6 py-20 animate-in">
      <header className="mb-24 text-center">
        <h1 className="text-5xl md:text-8xl font-bold tracking-tighter mb-6 italic underline decoration-white/10">{podcastConfig.title}</h1>
        <p className="text-neutral-500 text-xl font-light max-w-2xl mx-auto tracking-wide leading-relaxed">{podcastConfig.description}</p>
      </header>
      {sortedEpisodes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {sortedEpisodes.map(episode => (
            <Link key={episode.id} to={`/podcast/${episode.slug}`} className="group flex flex-col bg-neutral-900/10 border border-white/5 hover:border-white/30 transition-all duration-500 overflow-hidden rounded-sm">
              <div className="aspect-square overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-700 relative">
                <img src={resolveImage(episode.image)} alt={episode.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                <div className="absolute top-4 right-4 px-2 py-1 bg-black/60 backdrop-blur-sm text-[8px] mono text-white uppercase tracking-widest border border-white/10">{episode.duration}</div>
              </div>
              <div className="p-8 space-y-4 flex-grow relative">
                <div className="absolute top-0 left-0 w-1 h-0 bg-white group-hover:h-full transition-all duration-500" />
                <div className="flex justify-between items-center">
                  <div className="text-[9px] mono text-neutral-600 uppercase tracking-[0.3em] font-medium">{episode.date}</div>
                  <div className="text-[8px] mono text-neutral-600 uppercase">{episode.mediaType}</div>
                </div>
                <h3 className="text-2xl font-bold italic group-hover:text-white transition-colors leading-tight tracking-tight line-clamp-2">{episode.title}</h3>
                <p className="text-neutral-500 text-sm font-light leading-relaxed line-clamp-3 italic">"{episode.description}"</p>
                <div className="pt-6 flex items-center gap-3 text-[10px] uppercase tracking-widest text-neutral-600 group-hover:text-white transition-colors font-bold">
                  <span>Stream Protocol</span>
                  <span className="w-8 h-px bg-neutral-800 group-hover:w-12 group-hover:bg-white transition-all duration-500" />
                  <span>→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center border border-dashed border-white/5 bg-neutral-900/10 rounded-sm">
          <p className="text-xs uppercase mono tracking-[0.5em] text-neutral-700">No Episodes Found in Catalog</p>
        </div>
      )}
    </div>
  )
}

export default Podcast
