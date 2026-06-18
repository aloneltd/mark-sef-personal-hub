import React from 'react'
import { ContentStore, ThemeConfig } from '../types'

interface ThemeAdminProps {
  store: ContentStore
  onUpdate: (newStore: ContentStore) => void
}

const FONTS = ['Inter', 'JetBrains Mono', 'Georgia', 'Arial']
const RADII = [
  { label: 'None (Industrial)', value: 'none' },
  { label: 'Small', value: 'sm' },
  { label: 'Medium', value: 'md' },
  { label: 'Full (Modern)', value: 'full' },
]

const PRESETS = [
  { id: 'deco', year: '1925', name: 'Gatsby Gold', desc: 'Gold / Serif / Luxe', config: { backgroundColor: '#121212', surfaceColor: '#1e1e1e', primaryColor: '#d4af37', textColor: '#e5e5e5', headingFont: 'Georgia', bodyFont: 'Georgia', cornerRadius: 'sm', contrast: 15 } },
  { id: 'retro', year: '1982', name: 'Retro Terminal', desc: 'Green / Mono / Matrix', config: { backgroundColor: '#000000', surfaceColor: '#0c1a0c', primaryColor: '#00ff41', textColor: '#00ff41', headingFont: 'JetBrains Mono', bodyFont: 'JetBrains Mono', cornerRadius: 'none', contrast: 30 } },
  { id: 'synth', year: '1985', name: 'Synthwave Night', desc: 'Neon / Inter / Glow', config: { backgroundColor: '#0f0014', surfaceColor: '#1a0024', primaryColor: '#ff00ff', textColor: '#00ffff', headingFont: 'Inter', bodyFont: 'Inter', cornerRadius: 'none', contrast: 25 } },
  { id: 'y2k', year: '1999', name: 'Millennium', desc: 'Silver / Arial / Tech', config: { backgroundColor: '#000000', surfaceColor: '#111111', primaryColor: '#ccff00', textColor: '#cccccc', headingFont: 'Arial', bodyFont: 'Arial', cornerRadius: 'sm', contrast: 20 } },
  { id: 'modern', year: '2024', name: 'Modern Operator', desc: 'White / Inter / Sharp', config: { backgroundColor: '#0a0a0a', surfaceColor: '#171717', primaryColor: '#ffffff', textColor: '#f5f5f5', headingFont: 'Inter', bodyFont: 'Inter', cornerRadius: 'none', contrast: 10 } },
  { id: 'solar', year: '2035', name: 'Solar Punk', desc: 'Green / Inter / Eco', config: { backgroundColor: '#051a05', surfaceColor: '#0a260a', primaryColor: '#4ade80', textColor: '#dcfce7', headingFont: 'Inter', bodyFont: 'Inter', cornerRadius: 'md', contrast: 10 } },
  { id: 'cyber', year: '2077', name: 'Night City', desc: 'Yellow / Sans / Edge', config: { backgroundColor: '#050505', surfaceColor: '#111111', primaryColor: '#facc15', textColor: '#e5e5e5', headingFont: 'Arial', bodyFont: 'Arial', cornerRadius: 'none', contrast: 35 } },
]

export const ThemeAdmin: React.FC<ThemeAdminProps> = ({ store, onUpdate }) => {
  const theme = store.theme
  const updateTheme = (updates: Partial<ThemeConfig>) => onUpdate({ ...store, theme: { ...theme, ...updates } })

  return (
    <div className="space-y-12 animate-in pb-20">
      <header className="border-b border-white/5 pb-6">
        <h2 className="text-xl font-bold tracking-tight uppercase mono">UI Synthesis Module</h2>
        <p className="text-[10px] text-neutral-500 mono uppercase tracking-widest mt-1">Global Aesthetic Logic Protocol</p>
      </header>

      <section className="space-y-6">
        <h3 className="text-xs uppercase mono tracking-[0.3em] text-neutral-400 font-bold border-l border-white/20 pl-4">Time Capsule Presets</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {PRESETS.map(preset => (
            <button key={preset.id} onClick={() => updateTheme(preset.config as any)} className="p-4 border border-white/5 bg-white/5 hover:bg-white/10 transition-all rounded-sm text-left group relative overflow-hidden" style={{ borderColor: `color-mix(in srgb, ${preset.config.primaryColor} 20%, transparent)` }}>
              <div className="absolute top-0 right-0 p-1 text-[8px] mono font-bold opacity-50" style={{ color: preset.config.textColor }}>{preset.year}</div>
              <div className="pt-4">
                <div className="text-sm font-bold italic transition-colors mb-1 truncate" style={{ color: preset.config.primaryColor }}>{preset.name}</div>
                <div className="text-[8px] mono text-neutral-500 uppercase truncate">{preset.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 border-t border-white/5 pt-12">
        <section className="space-y-6">
          <h3 className="text-xs uppercase mono tracking-[0.3em] text-neutral-400 font-bold border-l border-white/20 pl-4">Spectral Analysis</h3>
          <div className="space-y-4">
            {[['Master Background', 'backgroundColor'], ['Primary Accent', 'primaryColor'], ['Surface Layer', 'surfaceColor'], ['Text Protocol', 'textColor']].map(([label, key]) => (
              <div key={key} className="flex items-center justify-between p-4 border border-white/5 bg-neutral-900/10 rounded-sm">
                <label className="text-[10px] mono uppercase text-neutral-500">{label}</label>
                <input type="color" value={(theme as any)[key]} onChange={e => updateTheme({ [key]: e.target.value } as any)} className="w-12 h-8 bg-transparent cursor-pointer" />
              </div>
            ))}
            <div className="pt-4">
              <label className="text-[8px] mono uppercase text-neutral-500 font-bold block mb-2">Contrast Sensitivity</label>
              <div className="flex items-center gap-4 p-4 border border-white/5 bg-neutral-900/10 rounded-sm">
                <input type="range" min="0" max="40" value={theme.contrast} onChange={e => updateTheme({ contrast: parseInt(e.target.value) })} className="flex-grow accent-white" />
                <span className="text-[10px] mono text-neutral-400">{theme.contrast}%</span>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <h3 className="text-xs uppercase mono tracking-[0.3em] text-neutral-400 font-bold border-l border-white/20 pl-4">Structural Logic</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[8px] mono uppercase text-neutral-500 font-bold">Heading Font</label>
              <select className="w-full bg-black border border-white/10 p-3 text-xs outline-none focus:border-white/30 mono uppercase" value={theme.headingFont} onChange={e => updateTheme({ headingFont: e.target.value as any })}>
                {FONTS.map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[8px] mono uppercase text-neutral-500 font-bold">Body Font</label>
              <select className="w-full bg-black border border-white/10 p-3 text-xs outline-none focus:border-white/30 mono uppercase" value={theme.bodyFont} onChange={e => updateTheme({ bodyFont: e.target.value as any })}>
                {FONTS.map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="space-y-2 pt-4">
              <label className="text-[8px] mono uppercase text-neutral-500 font-bold">Base Font Scale</label>
              <div className="flex items-center gap-4 p-4 border border-white/5 bg-neutral-900/10 rounded-sm">
                <span className="text-[10px] mono text-neutral-600">A-</span>
                <input type="range" min="12" max="24" step="1" value={theme.fontSize || 16} onChange={e => updateTheme({ fontSize: parseInt(e.target.value) || 16 })} className="flex-grow accent-white" />
                <span className="text-[10px] mono text-neutral-600">A+</span>
                <span className="text-xs font-bold mono w-8 text-right text-white">{theme.fontSize || 16}px</span>
              </div>
            </div>
            <div className="space-y-2 pt-4">
              <label className="text-[8px] mono uppercase text-neutral-500 font-bold">Corner Protocol</label>
              <div className="grid grid-cols-2 gap-2">
                {RADII.map(r => (
                  <button key={r.value} onClick={() => updateTheme({ cornerRadius: r.value as any })} className={`p-3 text-[9px] uppercase mono border transition-all ${theme.cornerRadius === r.value ? 'bg-white text-black border-white font-bold' : 'text-neutral-500 border-white/10 hover:border-white/20 bg-neutral-900/20'}`}>{r.label}</button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
