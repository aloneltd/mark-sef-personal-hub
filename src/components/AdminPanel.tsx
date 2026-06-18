import React, { useState, useEffect, useRef } from 'react'
import { ContentStore, SectionType, SectionDefinition, ImageSource, NavLink, BlogPost, PodcastEpisode } from '../types'
import { saveStore, DEFAULT_CONTENT } from '../store'
import { supabase } from '../lib/supabase'
import AdminPreview from './AdminPreview'
import { CommunityAdmin } from '../modules/CommunityAdmin'
import { ThemeAdmin } from '../modules/ThemeAdmin'
import * as pdfjsLib from 'pdfjs-dist'
import Cropper from 'react-easy-crop'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`

interface AdminPanelProps {
  store: ContentStore
  onUpdate: (newStore: ContentStore) => void
  isAdmin: boolean
}

const SECTION_TYPES: SectionType[] = [
  'hero', 'split', 'grid_cards', 'rich_text', 'logo_strip',
  'cta', 'timeline', 'media_embed', 'ai_chat', 'community_form', 'contact_methods',
]

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', error => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })

async function getCroppedImg(imageSrc: string, pixelCrop: any, rotation = 0): Promise<string> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  const maxSize = Math.max(image.width, image.height)
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2))
  canvas.width = safeArea
  canvas.height = safeArea
  ctx.translate(safeArea / 2, safeArea / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.translate(-safeArea / 2, -safeArea / 2)
  ctx.drawImage(image, safeArea / 2 - image.width * 0.5, safeArea / 2 - image.height * 0.5)
  const data = ctx.getImageData(0, 0, safeArea, safeArea)
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  ctx.putImageData(data, Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x), Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y))
  return canvas.toDataURL('image/jpeg', 0.8)
}

const ImageInput: React.FC<{ label: string; value: ImageSource; onChange: (val: ImageSource) => void }> = ({ label, value, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const openEditor = () => {
    if (value.value) { setImageSrc(value.value); setIsEditorOpen(true) }
  }
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader()
      reader.onload = () => { const result = reader.result as string; onChange({ type: 'upload', value: result }); setImageSrc(result); setIsEditorOpen(true) }
      reader.readAsDataURL(e.target.files[0])
    }
  }
  const handleSaveCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return
    setIsProcessing(true)
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, rotation)
      onChange({ type: 'upload', value: croppedImage })
      setIsEditorOpen(false); setImageSrc(null); setZoom(1); setRotation(0)
    } catch { alert('Failed to crop.') }
    finally { setIsProcessing(false) }
  }

  return (
    <div className="space-y-3">
      {isEditorOpen && imageSrc && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col h-full w-full">
          <div className="flex justify-between items-center p-4 bg-neutral-900 border-b border-white/10 shrink-0">
            <h3 className="text-xs uppercase mono text-white">Crop & Position</h3>
            <button onClick={() => setIsEditorOpen(false)} className="text-neutral-500 hover:text-white text-xs">Cancel</button>
          </div>
          <div className="relative flex-grow bg-[#111]">
            <Cropper image={imageSrc} crop={crop} zoom={zoom} rotation={rotation} aspect={4 / 3} onCropChange={setCrop} onCropComplete={(_a: any, b: any) => setCroppedAreaPixels(b)} onZoomChange={setZoom} objectFit="contain" />
          </div>
          <div className="p-4 bg-neutral-900 shrink-0 flex flex-col gap-4">
            <div className="flex gap-4 items-center"><label className="text-[9px] mono text-neutral-500 w-12">Zoom</label><input type="range" min={1} max={3} step={0.1} value={zoom} onChange={e => setZoom(Number(e.target.value))} className="flex-grow" /></div>
            <div className="flex gap-4 items-center"><label className="text-[9px] mono text-neutral-500 w-12">Rotate</label><input type="range" min={0} max={360} value={rotation} onChange={e => setRotation(Number(e.target.value))} className="flex-grow" /></div>
            <button onClick={handleSaveCrop} disabled={isProcessing} className="w-full py-3 bg-white text-black font-bold uppercase text-xs">{isProcessing ? 'Processing...' : 'Apply Crop'}</button>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center">
        <label className="text-[9px] uppercase tracking-[0.3em] text-neutral-500 mono">{label}</label>
        {value.value && <div className="flex gap-2"><button onClick={openEditor} className="text-[9px] text-blue-500 uppercase mono">Edit / Crop</button><button onClick={() => onChange({ type: 'url', value: '' })} className="text-[9px] text-red-500 uppercase mono">Clear</button></div>}
      </div>
      {value.type === 'url' ? (
        <input type="text" className="w-full bg-black border border-white/10 p-3 text-xs outline-none focus:border-white/30" placeholder="https://..." value={value.value} onChange={e => onChange({ ...value, value: e.target.value })} />
      ) : (
        <div className="flex gap-2">
          <button onClick={() => fileInputRef.current?.click()} className="flex-grow py-3 border border-white/10 bg-neutral-900 text-[9px] uppercase mono text-neutral-300 hover:bg-white/5">{value.value ? 'Replace File' : 'Select File'}</button>
          <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
        </div>
      )}
      <div className="flex gap-2">
        {(['url', 'upload'] as const).map(mode => (
          <button key={mode} onClick={() => onChange({ ...value, type: mode })} className={`px-2 py-1 text-[8px] uppercase border ${value.type === mode ? 'bg-white text-black border-white' : 'text-neutral-500 border-white/10'}`}>{mode}</button>
        ))}
      </div>
    </div>
  )
}

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    if (!supabase) { setError('Supabase not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel.'); setLoading(false); return }
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) setError(err.message)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      <div className="w-full max-w-sm p-10 border border-white/10 bg-neutral-900/50">
        <h1 className="text-xl font-bold italic mb-2">Master Control</h1>
        <p className="text-[10px] mono uppercase text-neutral-600 mb-8">Admin Access Required</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-[9px] mono uppercase text-neutral-500 block mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-black border border-white/10 p-3 text-sm outline-none focus:border-white/30" required />
          </div>
          <div>
            <label className="text-[9px] mono uppercase text-neutral-500 block mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black border border-white/10 p-3 text-sm outline-none focus:border-white/30" required />
          </div>
          {error && <p className="text-red-400 text-xs mono">{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-3 bg-white text-black font-bold uppercase text-xs tracking-widest hover:bg-neutral-200 disabled:opacity-50">
            {loading ? 'Authenticating...' : 'Access Control'}
          </button>
        </form>
      </div>
    </div>
  )
}

const AdminPanel: React.FC<AdminPanelProps> = ({ store, onUpdate, isAdmin }) => {
  const [localStore, setLocalStore] = useState<ContentStore>(store)
  const [activeTab, setActiveTab] = useState<'builder' | 'theme' | 'brand' | 'modules' | 'community' | 'blog' | 'podcast' | 'ai' | 'nav' | 'auth'>('builder')
  const [selectedPage, setSelectedPage] = useState<keyof ContentStore['pageLayouts']>('home')
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [editingEpisodeId, setEditingEpisodeId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (!isAdmin) return <LoginForm />

  const syncUpdate = (newStore: ContentStore) => {
    setLocalStore(newStore)
    onUpdate(newStore)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveStore(localStore)
      onUpdate(localStore)
      alert('DEPLOYMENT SUCCESSFUL.')
    } catch (e: any) {
      alert('DEPLOYMENT FAILED: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('Reset all content to defaults? This cannot be undone.')) return
    setSaving(true)
    try {
      await saveStore(DEFAULT_CONTENT)
      syncUpdate(DEFAULT_CONTENT)
      alert('Reset to defaults.')
    } catch (e: any) {
      alert('Reset failed: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut()
  }

  const renderSectionEditor = (section: SectionDefinition, onSectionUpdate: (updates: Partial<SectionDefinition>) => void) => {
    const updateProp = (key: string, val: any) => onSectionUpdate({ props: { ...section.props, [key]: val } })
    return (
      <div className="space-y-6 p-4 border border-white/10 bg-neutral-900/30 rounded-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-black border border-white/5 rounded-sm space-y-4">
            <h4 className="text-[9px] mono uppercase text-neutral-500 font-bold">Section Background</h4>
            <ImageInput label="BG Image" value={section.props?.backgroundImage || { type: 'url', value: '' }} onChange={v => updateProp('backgroundImage', v)} />
            <div className="space-y-1">
              <label className="text-[8px] mono uppercase text-neutral-500">Overlay Opacity ({section.props?.overlayOpacity || 0}%)</label>
              <input type="range" min="0" max="100" value={section.props?.overlayOpacity || 0} onChange={e => updateProp('overlayOpacity', parseInt(e.target.value))} className="w-full accent-white" />
            </div>
          </div>
          <div className="p-4 bg-black border border-white/5 rounded-sm space-y-4">
            <h4 className="text-[9px] mono uppercase text-neutral-500 font-bold">Content Box Background</h4>
            <ImageInput label="Box BG Image" value={section.props?.contentBackgroundImage || { type: 'url', value: '' }} onChange={v => updateProp('contentBackgroundImage', v)} />
          </div>
        </div>
        {section.type === 'split' && (
          <div className="p-4 bg-black border border-white/5 rounded-sm space-y-4 mt-4">
            <h4 className="text-[9px] mono uppercase text-neutral-500 font-bold">Layout Configuration</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[8px] mono uppercase text-neutral-500">Image Aspect</label>
                <select value={section.style.mediaAspect || 'video'} onChange={e => onSectionUpdate({ style: { ...section.style, mediaAspect: e.target.value as any } })} className="w-full bg-black border border-white/10 p-2 text-xs uppercase">
                  <option value="video">Video (16:9)</option>
                  <option value="square">Square (1:1)</option>
                  <option value="portrait">Portrait (3:4)</option>
                  <option value="landscape">Landscape (4:3)</option>
                  <option value="original">Original</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] mono uppercase text-neutral-500">Layout Direction</label>
                <select value={section.style.layoutVariant || 'default'} onChange={e => onSectionUpdate({ style: { ...section.style, layoutVariant: e.target.value } })} className="w-full bg-black border border-white/10 p-2 text-xs uppercase">
                  <option value="default">Default (Image Right)</option>
                  <option value="reversed">Reversed (Image Left)</option>
                </select>
              </div>
            </div>
          </div>
        )}
        <h4 className="text-[10px] mono uppercase text-neutral-500 font-bold border-t border-white/5 pt-4">{section.type} Content</h4>
        {Object.keys(section.props || {}).filter(k => !['backgroundImage', 'overlayOpacity', 'hoverImage', 'contentBackgroundImage', 'contentBackgroundOpacity'].includes(k)).map(propKey => {
          const isImageProp = propKey.toLowerCase().includes('image') || propKey === 'avatar'
          return (
            <div key={propKey}>
              {isImageProp ? (
                <ImageInput label={propKey} value={section.props[propKey]} onChange={val => updateProp(propKey, val)} />
              ) : typeof section.props[propKey] === 'string' ? (
                <div className="space-y-2">
                  <label className="block text-[9px] uppercase tracking-[0.3em] text-neutral-500 mono">{propKey}</label>
                  <textarea className="w-full bg-black border border-white/10 p-3 text-xs outline-none focus:border-white/30 h-24" value={section.props[propKey]} onChange={e => updateProp(propKey, e.target.value)} />
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    )
  }

  const currentSections = localStore.pageLayouts[selectedPage].sections
  const currentSection = currentSections.find(s => s.id === selectedSectionId)

  const updateBrand = (key: keyof ContentStore['brand'], value: any) => {
    syncUpdate({ ...localStore, brand: { ...localStore.brand, [key]: value } })
  }
  const toggleModule = (key: string) => {
    const modules = { ...localStore.modules };
    (modules as any)[key].enabled = !(modules as any)[key].enabled
    syncUpdate({ ...localStore, modules })
  }
  const updateModuleConfig = (key: string, field: string, value: any) => {
    const modules = { ...localStore.modules };
    (modules as any)[key][field] = value
    syncUpdate({ ...localStore, modules })
  }
  const toggleNav = (idx: number) => {
    const nav = [...localStore.navigation]
    nav[idx].visible = !nav[idx].visible
    syncUpdate({ ...localStore, navigation: nav })
  }
  const updateNav = (idx: number, val: string) => {
    const nav = [...localStore.navigation]
    nav[idx].label = val
    syncUpdate({ ...localStore, navigation: nav })
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black h-[100dvh]">
      <div className="grid grid-cols-1 lg:grid-cols-2 h-full w-full">
        <div className="flex flex-col border-r border-white/5 bg-[#0d0d0d] overflow-y-auto w-full h-full">
          <div className="px-6 py-10">
            <div className="flex justify-between items-start mb-10">
              <h1 className="text-3xl font-bold italic">Master Control</h1>
              <div className="flex gap-2">
                <button onClick={handleReset} className="px-4 py-2 border border-red-500/30 text-red-500 text-[9px] uppercase mono">Purge</button>
                <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-white text-black font-bold text-[10px] uppercase tracking-widest hover:bg-neutral-200 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Deploy'}
                </button>
              </div>
            </div>

            <div className="flex gap-1 border-b border-white/5 mb-8 overflow-x-auto pb-2">
              {(['builder', 'brand', 'modules', 'theme', 'community', 'blog', 'podcast', 'ai', 'nav', 'auth'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-[9px] uppercase tracking-widest mono whitespace-nowrap ${activeTab === tab ? 'bg-white/10 text-white' : 'text-neutral-500'}`}>{tab}</button>
              ))}
            </div>

            {activeTab === 'builder' && (
              <div className="space-y-10">
                <div className="flex gap-4">
                  <select value={selectedPage} onChange={e => setSelectedPage(e.target.value as any)} className="bg-black border border-white/10 p-2 text-xs uppercase text-white outline-none flex-grow">
                    {Object.keys(localStore.pageLayouts).map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                  </select>
                  <select onChange={e => {
                    const type = e.target.value as SectionType
                    if (!type) return
                    const newSection: SectionDefinition = { id: `s_${Math.random().toString(36).substr(2, 9)}`, type, enabled: true, order: currentSections.length, props: {}, style: { layoutVariant: 'default', surface: 'transparent', emphasis: 'normal', density: 'normal', width: 'standard', textAlign: 'left' } }
                    syncUpdate({ ...localStore, pageLayouts: { ...localStore.pageLayouts, [selectedPage]: { sections: [...currentSections, newSection] } } })
                    e.target.value = ''
                  }} className="bg-black border border-white/10 p-2 text-xs uppercase outline-none flex-grow">
                    <option value="">+ Add Protocol</option>
                    {SECTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-1">
                    {currentSections.map((s, idx) => (
                      <div key={s.id} onClick={() => setSelectedSectionId(s.id)} className={`p-3 border cursor-pointer ${selectedSectionId === s.id ? 'border-white bg-white/5' : 'border-white/5 bg-neutral-900/10'}`}>
                        <span className="text-[9px] mono text-neutral-500 mr-2">{idx + 1}</span>
                        <span className="text-[10px] uppercase font-bold">{s.type}</span>
                      </div>
                    ))}
                  </div>
                  <div className="md:col-span-2">
                    {currentSection ? renderSectionEditor(currentSection, updates => {
                      const sections = [...currentSections]
                      const idx = sections.findIndex(s => s.id === currentSection.id)
                      if (idx > -1) { sections[idx] = { ...sections[idx], ...updates, props: { ...sections[idx].props, ...(updates.props || {}) } }; syncUpdate({ ...localStore, pageLayouts: { ...localStore.pageLayouts, [selectedPage]: { sections } } }) }
                    }) : <div className="text-center text-xs mono text-neutral-600 pt-10">Select a section to edit</div>}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'brand' && (
              <div className="space-y-8 animate-in">
                <h3 className="text-xs uppercase mono tracking-widest font-bold">Brand Identity</h3>
                <div className="space-y-4">
                  <div className="space-y-1"><label className="text-[9px] mono uppercase text-neutral-500">Name</label><input className="w-full bg-black border border-white/10 p-3 text-sm" value={localStore.brand.name} onChange={e => updateBrand('name', e.target.value)} /></div>
                  <div className="space-y-1"><label className="text-[9px] mono uppercase text-neutral-500">Identity Line</label><input className="w-full bg-black border border-white/10 p-3 text-sm" value={localStore.brand.identityLine} onChange={e => updateBrand('identityLine', e.target.value)} /></div>
                  <div className="space-y-1"><label className="text-[9px] mono uppercase text-neutral-500">Positioning</label><textarea className="w-full bg-black border border-white/10 p-3 text-sm h-24" value={localStore.brand.positioning} onChange={e => updateBrand('positioning', e.target.value)} /></div>
                  <div className="space-y-1"><label className="text-[9px] mono uppercase text-neutral-500">Operator Statement</label><textarea className="w-full bg-black border border-white/10 p-3 text-sm h-24" value={localStore.brand.operatorStatement} onChange={e => updateBrand('operatorStatement', e.target.value)} /></div>
                  <ImageInput label="Hero Image" value={localStore.brand.heroImage} onChange={v => updateBrand('heroImage', v)} />
                </div>
              </div>
            )}

            {activeTab === 'modules' && (
              <div className="space-y-8 animate-in">
                <h3 className="text-xs uppercase mono tracking-widest font-bold">Feature Modules</h3>
                <div className="grid gap-4">
                  {Object.entries(localStore.modules).map(([key, config]) => {
                    const typedConfig = config as any
                    return (
                      <div key={key} className="p-4 border border-white/5 bg-neutral-900/10 rounded-sm space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-sm font-bold uppercase">{key}</h4>
                          <label className="flex items-center gap-2 text-[9px] mono uppercase cursor-pointer"><input type="checkbox" className="accent-white" checked={typedConfig.enabled} onChange={() => toggleModule(key)} /> Enabled</label>
                        </div>
                        <div className="space-y-2">
                          <input className="w-full bg-black border border-white/10 p-2 text-xs" value={typedConfig.title || ''} onChange={e => updateModuleConfig(key, 'title', e.target.value)} placeholder="Title" />
                          <input className="w-full bg-black border border-white/10 p-2 text-xs" value={typedConfig.description || ''} onChange={e => updateModuleConfig(key, 'description', e.target.value)} placeholder="Description" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {activeTab === 'nav' && (
              <div className="space-y-8 animate-in">
                <h3 className="text-xs uppercase mono tracking-widest font-bold">Navigation Matrix</h3>
                <div className="space-y-2">
                  {localStore.navigation.map((nav, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-3 border border-white/5 bg-neutral-900/10">
                      <input type="checkbox" className="accent-white" checked={nav.visible} onChange={() => toggleNav(idx)} />
                      <input className="bg-transparent border-b border-white/10 flex-grow text-xs focus:border-white outline-none" value={nav.label} onChange={e => updateNav(idx, e.target.value)} />
                      <span className="text-[9px] mono text-neutral-500">{nav.path}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'auth' && (
              <div className="space-y-8 animate-in">
                <h3 className="text-xs uppercase mono tracking-widest font-bold">Session</h3>
                <div className="p-6 border border-white/5 bg-neutral-900/10 rounded-sm space-y-4">
                  <p className="text-sm text-neutral-300">Signed in as <span className="font-bold text-white">m@alone.ltd</span></p>
                  <p className="text-[10px] text-neutral-500 mono">Admin access granted via Supabase Auth.</p>
                  <button onClick={handleSignOut} className="px-4 py-2 border border-white/20 text-white text-[10px] uppercase mono hover:bg-white/5">Sign Out</button>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-8 animate-in">
                <h3 className="text-xs uppercase mono tracking-widest font-bold">AI Concierge Protocol</h3>
                <div className="space-y-4">
                  <div className="space-y-1"><label className="text-[9px] mono uppercase text-neutral-500">System Instruction</label><textarea className="w-full bg-black border border-white/10 p-3 text-xs h-32" value={localStore.modules.aiConcierge.systemInstruction} onChange={e => syncUpdate({ ...localStore, modules: { ...localStore.modules, aiConcierge: { ...localStore.modules.aiConcierge, systemInstruction: e.target.value } } })} /></div>
                  <div className="space-y-1"><label className="text-[9px] mono uppercase text-neutral-500">Guardrails</label><textarea className="w-full bg-black border border-white/10 p-3 text-xs h-20" value={localStore.modules.aiConcierge.guardrails} onChange={e => syncUpdate({ ...localStore, modules: { ...localStore.modules, aiConcierge: { ...localStore.modules.aiConcierge, guardrails: e.target.value } } })} /></div>
                  <div className="space-y-1"><label className="text-[9px] mono uppercase text-neutral-500">Knowledge Base</label><textarea className="w-full bg-black border border-white/10 p-3 text-xs h-32" value={localStore.modules.aiConcierge.knowledgeBase} onChange={e => syncUpdate({ ...localStore, modules: { ...localStore.modules, aiConcierge: { ...localStore.modules.aiConcierge, knowledgeBase: e.target.value } } })} /></div>
                  <div className="space-y-1"><label className="text-[9px] mono uppercase text-neutral-500">Welcome Message</label><input className="w-full bg-black border border-white/10 p-3 text-xs" value={localStore.modules.aiConcierge.welcomeMessage} onChange={e => syncUpdate({ ...localStore, modules: { ...localStore.modules, aiConcierge: { ...localStore.modules.aiConcierge, welcomeMessage: e.target.value } } })} /></div>
                  <label className="flex items-center gap-2 text-[10px] mono uppercase cursor-pointer"><input type="checkbox" className="accent-white" checked={localStore.modules.aiConcierge.floatingChatEnabled} onChange={e => syncUpdate({ ...localStore, modules: { ...localStore.modules, aiConcierge: { ...localStore.modules.aiConcierge, floatingChatEnabled: e.target.checked } } })} /> Enable Floating Chat</label>
                </div>
              </div>
            )}

            {activeTab === 'blog' && (
              <div className="space-y-8 animate-in">
                {editingPostId ? (
                  <div className="space-y-6 border border-white/5 p-6 bg-neutral-900/10">
                    <button onClick={() => setEditingPostId(null)} className="text-[10px] mono uppercase border-b border-white/10">← Back to Index</button>
                    {(() => {
                      const post = localStore.modules.blog.posts.find(p => p.id === editingPostId)
                      if (!post) return null
                      const updatePost = (u: Partial<BlogPost>) => {
                        const updatedPosts = localStore.modules.blog.posts.map(p => p.id === editingPostId ? { ...p, ...u } : p)
                        syncUpdate({ ...localStore, modules: { ...localStore.modules, blog: { ...localStore.modules.blog, posts: updatedPosts } } })
                      }
                      return (
                        <div className="space-y-4">
                          <input className="w-full bg-black border border-white/10 p-3 text-xl font-bold" value={post.title} onChange={e => updatePost({ title: e.target.value })} placeholder="Post Title" />
                          <div className="grid grid-cols-2 gap-4">
                            <input className="bg-black border border-white/10 p-2 text-xs mono" value={post.slug} onChange={e => updatePost({ slug: e.target.value })} placeholder="slug" />
                            <input className="bg-black border border-white/10 p-2 text-xs mono" value={post.date} onChange={e => updatePost({ date: e.target.value })} placeholder="YYYY-MM-DD" />
                          </div>
                          <ImageInput label="Cover Image" value={post.image} onChange={v => updatePost({ image: v })} />
                          <textarea className="w-full bg-black border border-white/10 p-3 text-sm h-32" value={post.excerpt} onChange={e => updatePost({ excerpt: e.target.value })} placeholder="Excerpt" />
                          <textarea className="w-full bg-black border border-white/10 p-3 text-sm h-64 font-mono text-xs" value={post.content} onChange={e => updatePost({ content: e.target.value })} placeholder="Content (markdown/HTML)" />
                          <label className="flex items-center gap-2 text-[10px] mono uppercase"><input type="checkbox" checked={post.published} onChange={e => updatePost({ published: e.target.checked })} /> Published</label>
                        </div>
                      )
                    })()}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <button onClick={() => {
                      const newPost: BlogPost = { id: Math.random().toString(36).substr(2, 9), title: 'New Briefing', slug: 'new-briefing', date: new Date().toISOString().split('T')[0], excerpt: '', content: '', author: 'Mark SEF', published: false, image: { type: 'url', value: '' }, sections: [] }
                      syncUpdate({ ...localStore, modules: { ...localStore.modules, blog: { ...localStore.modules.blog, posts: [newPost, ...localStore.modules.blog.posts] } } })
                      setEditingPostId(newPost.id)
                    }} className="w-full py-3 bg-white text-black font-bold uppercase text-xs">+ New Briefing</button>
                    <div className="space-y-2">
                      {localStore.modules.blog.posts.map(p => (
                        <div key={p.id} onClick={() => setEditingPostId(p.id)} className="flex justify-between items-center p-3 border border-white/5 hover:bg-white/5 cursor-pointer">
                          <span className="text-sm font-bold">{p.title}</span>
                          <span className={`text-[9px] mono uppercase ${p.published ? 'text-green-500' : 'text-neutral-500'}`}>{p.published ? 'LIVE' : 'DRAFT'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'podcast' && (
              <div className="space-y-8 animate-in">
                {editingEpisodeId ? (
                  <div className="space-y-6 border border-white/5 p-6 bg-neutral-900/10">
                    <button onClick={() => setEditingEpisodeId(null)} className="text-[10px] mono uppercase border-b border-white/10">← Back to Catalog</button>
                    {(() => {
                      const ep = localStore.modules.podcast.episodes.find(e => e.id === editingEpisodeId)
                      if (!ep) return null
                      const updateEp = (u: Partial<PodcastEpisode>) => {
                        const updated = localStore.modules.podcast.episodes.map(e => e.id === editingEpisodeId ? { ...e, ...u } : e)
                        syncUpdate({ ...localStore, modules: { ...localStore.modules, podcast: { ...localStore.modules.podcast, episodes: updated } } })
                      }
                      return (
                        <div className="space-y-4">
                          <input className="w-full bg-black border border-white/10 p-3 text-xl font-bold" value={ep.title} onChange={e => updateEp({ title: e.target.value })} placeholder="Episode Title" />
                          <div className="grid grid-cols-3 gap-4">
                            <input className="bg-black border border-white/10 p-2 text-xs mono" value={ep.slug} onChange={e => updateEp({ slug: e.target.value })} placeholder="slug" />
                            <input className="bg-black border border-white/10 p-2 text-xs mono" value={ep.date} onChange={e => updateEp({ date: e.target.value })} placeholder="YYYY-MM-DD" />
                            <input className="bg-black border border-white/10 p-2 text-xs mono" value={ep.duration} onChange={e => updateEp({ duration: e.target.value })} placeholder="MM:SS" />
                          </div>
                          <ImageInput label="Cover Image" value={ep.image} onChange={v => updateEp({ image: v })} />
                          <textarea className="w-full bg-black border border-white/10 p-3 text-sm h-32" value={ep.description} onChange={e => updateEp({ description: e.target.value })} placeholder="Description" />
                          <textarea className="w-full bg-black border border-white/10 p-3 text-sm h-48" value={ep.showNotes} onChange={e => updateEp({ showNotes: e.target.value })} placeholder="Show Notes" />
                          <input className="w-full bg-black border border-white/10 p-3 text-xs mono" value={ep.mediaUrl} onChange={e => updateEp({ mediaUrl: e.target.value })} placeholder="Media URL" />
                          <label className="flex items-center gap-2 text-[10px] mono uppercase"><input type="checkbox" checked={ep.published} onChange={e => updateEp({ published: e.target.checked })} /> Published</label>
                        </div>
                      )
                    })()}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <button onClick={() => {
                      const newEp: PodcastEpisode = { id: Math.random().toString(36).substr(2, 9), title: 'New Episode', slug: 'new-ep', date: new Date().toISOString().split('T')[0], duration: '00:00', description: '', showNotes: '', mediaType: 'audio', mediaUrl: '', platformLinks: {}, published: false, image: { type: 'url', value: '' }, sections: [] }
                      syncUpdate({ ...localStore, modules: { ...localStore.modules, podcast: { ...localStore.modules.podcast, episodes: [newEp, ...localStore.modules.podcast.episodes] } } })
                      setEditingEpisodeId(newEp.id)
                    }} className="w-full py-3 bg-white text-black font-bold uppercase text-xs">+ New Episode</button>
                    <div className="space-y-2">
                      {localStore.modules.podcast.episodes.map(e => (
                        <div key={e.id} onClick={() => setEditingEpisodeId(e.id)} className="flex justify-between items-center p-3 border border-white/5 hover:bg-white/5 cursor-pointer">
                          <span className="text-sm font-bold">{e.title}</span>
                          <span className={`text-[9px] mono uppercase ${e.published ? 'text-green-500' : 'text-neutral-500'}`}>{e.published ? 'LIVE' : 'DRAFT'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'theme' && <ThemeAdmin store={localStore} onUpdate={syncUpdate} />}
            {activeTab === 'community' && <CommunityAdmin store={localStore} onUpdate={syncUpdate} />}
          </div>
        </div>

        <div className="bg-black border-l border-white/5 relative hidden lg:block h-full">
          <AdminPreview store={localStore} activePageKey={selectedPage} activeTab={activeTab} editingPostId={editingPostId} editingEpisodeId={editingEpisodeId} onSelectSection={setSelectedSectionId} />
        </div>
      </div>
    </div>
  )
}

export default AdminPanel
