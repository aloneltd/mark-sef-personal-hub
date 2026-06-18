import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { ContentStore, ImageSource } from '../types'
import SectionRenderer from '../components/sections/SectionRenderer'

interface BlogProps {
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

const Blog: React.FC<BlogProps> = ({ store, previewSlug }) => {
  const { slug } = useParams<{ slug?: string }>()
  const blogConfig = store.modules.blog
  const posts = blogConfig.posts || []
  const activeSlug = previewSlug || slug

  if (!blogConfig.enabled) {
    return <div className="min-h-[60vh] flex items-center justify-center text-neutral-600 mono text-xs uppercase tracking-[0.3em]">Blog Protocol Offline</div>
  }

  if (activeSlug) {
    const post = posts.find(p => p.slug === activeSlug)
    if (!post) return <div className="p-20 text-center uppercase mono text-xs">Briefing Not Found</div>
    const sections = (post.sections || []).sort((a, b) => a.order - b.order)
    return (
      <div className="animate-in">
        <header className="relative h-[50vh] min-h-[400px] overflow-hidden bg-black">
          <img src={resolveImage(post.image)} alt={post.title} className="w-full h-full object-cover opacity-60 grayscale" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16 max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-4">
              <span className="px-2 py-1 bg-white text-black text-[9px] uppercase mono font-bold tracking-widest">Technical Briefing</span>
              <span className="text-neutral-500 text-[10px] mono uppercase tracking-widest">{post.date}</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold italic tracking-tight mb-4">{post.title}</h1>
            <p className="text-neutral-400 text-lg md:text-xl font-light max-w-2xl leading-relaxed">{post.excerpt}</p>
          </div>
        </header>
        <article className="min-h-[200px]">
          {sections.length > 0 ? sections.map(section => <SectionRenderer key={section.id} section={section} store={store} />) : (
            <div className="prose prose-invert prose-lg max-w-3xl mx-auto px-6 py-20 text-neutral-400 font-light leading-relaxed border-l border-white/5 pl-8 md:pl-12" dangerouslySetInnerHTML={{ __html: post.content }} />
          )}
          <div className="max-w-3xl mx-auto px-6 py-12 mt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
            <Link to="/blog" className="text-xs uppercase mono tracking-widest text-neutral-500 hover:text-white transition-colors border border-white/10 px-6 py-3 rounded-sm hover:bg-white/5">← Return to Index</Link>
            <div className="text-[9px] mono text-neutral-700 uppercase tracking-[0.4em]">End of Transmission // {post.id}</div>
          </div>
        </article>
      </div>
    )
  }

  const publishedPosts = posts.filter(p => p.published).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  return (
    <div className="max-w-6xl mx-auto px-6 py-20 animate-in">
      <header className="mb-24 text-center">
        <h1 className="text-5xl md:text-8xl font-bold tracking-tighter mb-6 italic underline decoration-white/10">{blogConfig.title}</h1>
        <p className="text-neutral-500 text-xl font-light max-w-2xl mx-auto tracking-wide leading-relaxed">{blogConfig.description}</p>
        <div className="mt-8 flex justify-center"><div className="h-px w-24 bg-gradient-to-r from-transparent via-white/20 to-transparent" /></div>
      </header>
      {publishedPosts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {publishedPosts.map(post => (
            <Link key={post.id} to={`/blog/${post.slug}`} className="group flex flex-col bg-neutral-900/10 border border-white/5 hover:border-white/30 transition-all duration-500 overflow-hidden rounded-sm">
              <div className="aspect-[16/10] overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-700">
                <img src={resolveImage(post.image)} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
              </div>
              <div className="p-8 space-y-4 flex-grow relative">
                <div className="absolute top-0 left-0 w-1 h-0 bg-white group-hover:h-full transition-all duration-500" />
                <div className="text-[9px] mono text-neutral-600 uppercase tracking-[0.3em] font-medium">{post.date}</div>
                <h3 className="text-2xl font-bold italic group-hover:text-white transition-colors leading-tight tracking-tight">{post.title}</h3>
                <p className="text-neutral-500 text-sm font-light leading-relaxed line-clamp-3">{post.excerpt}</p>
                <div className="pt-6 flex items-center gap-3 text-[10px] uppercase tracking-widest text-neutral-600 group-hover:text-white transition-colors font-bold">
                  <span>Initialize Briefing</span>
                  <span className="w-8 h-px bg-neutral-800 group-hover:w-12 group-hover:bg-white transition-all duration-500" />
                  <span>→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center border border-dashed border-white/5 bg-neutral-900/10 rounded-sm">
          <p className="text-xs uppercase mono tracking-[0.5em] text-neutral-700">No Briefings Found in Registry</p>
        </div>
      )}
    </div>
  )
}

export default Blog
