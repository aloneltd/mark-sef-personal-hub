import React from 'react'
import { ContentStore } from '../types'
import SectionRenderer from './sections/SectionRenderer'
import Blog from '../modules/Blog'
import Podcast from '../modules/Podcast'

interface AdminPreviewProps {
  store: ContentStore
  activePageKey: keyof ContentStore['pageLayouts']
  activeTab: string
  editingPostId?: string | null
  editingEpisodeId?: string | null
  onSelectSection?: (sectionId: string) => void
}

const AdminPreview: React.FC<AdminPreviewProps> = ({ store, activePageKey, activeTab, editingPostId, editingEpisodeId, onSelectSection }) => {
  if (activeTab === 'blog') {
    const post = store.modules.blog.posts.find(p => p.id === editingPostId)
    return (
      <div className="w-full h-full bg-[#0a0a0a] overflow-y-auto border border-white/10 rounded-sm shadow-2xl relative">
        <div className="p-4 bg-neutral-900/90 backdrop-blur-md border-b border-white/5 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest mono text-neutral-400">Preview: BLOG {post ? `> ${post.title.toUpperCase()}` : ''}</span>
          </div>
        </div>
        <div className="pb-20">{post ? <Blog store={store} previewSlug={post.slug} /> : <Blog store={store} />}</div>
      </div>
    )
  }

  if (activeTab === 'podcast') {
    const ep = store.modules.podcast.episodes.find(e => e.id === editingEpisodeId)
    return (
      <div className="w-full h-full bg-[#0a0a0a] overflow-y-auto border border-white/10 rounded-sm shadow-2xl relative">
        <div className="p-4 bg-neutral-900/90 backdrop-blur-md border-b border-white/5 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest mono text-neutral-400">Preview: PODCAST {ep ? `> ${ep.title.toUpperCase()}` : ''}</span>
          </div>
        </div>
        <div className="pb-20">{ep ? <Podcast store={store} previewSlug={ep.slug} /> : <Podcast store={store} />}</div>
      </div>
    )
  }

  const effectivePageKey = activeTab === 'ai' ? 'ai' : activePageKey
  const layout = store.pageLayouts[effectivePageKey as keyof ContentStore['pageLayouts']]

  if (!layout) {
    return <div className="w-full h-full bg-black flex items-center justify-center text-neutral-800 mono text-[9px] uppercase tracking-[0.4em]">Page Schema Missing</div>
  }

  const sortedSections = [...layout.sections].sort((a, b) => a.order - b.order)

  return (
    <div className="w-full h-full bg-[#0a0a0a] overflow-y-auto border border-white/10 rounded-sm shadow-2xl relative">
      <div className="p-4 bg-neutral-900/90 backdrop-blur-md border-b border-white/5 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] uppercase tracking-widest mono text-neutral-400">Live Preview: {effectivePageKey.toUpperCase()}</span>
        </div>
        <span className="text-[8px] mono text-neutral-600">SMART_PREVIEW_ACTIVE</span>
      </div>
      <div className="origin-top transform scale-[0.85] lg:scale-100 pb-20">
        {sortedSections.map(section => (
          <div key={section.id} className="relative group/preview" onClick={() => onSelectSection?.(section.id)}>
            <div className="absolute inset-0 border-2 border-transparent group-hover/preview:border-blue-500/50 cursor-pointer z-50 transition-all pointer-events-auto">
              <div className="absolute top-2 right-2 bg-blue-600 text-white text-[9px] font-bold px-2 py-1 uppercase tracking-widest opacity-0 group-hover/preview:opacity-100 transition-opacity shadow-lg">Edit</div>
            </div>
            <div className="pointer-events-none"><SectionRenderer section={section} store={store} /></div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AdminPreview
