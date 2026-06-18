import React, { useMemo, useState } from 'react'
import { NavLink, ThemeConfig, ContentStore } from '../types'
import { Link, useLocation } from 'react-router-dom'
import FloatingAIChat from './FloatingAIChat'

interface LayoutProps {
  children: React.ReactNode
  navLinks: NavLink[]
  brandName: string
  theme: ThemeConfig
  store: ContentStore
  onUpdate: (newStore: ContentStore) => void
  isAdmin: boolean
}

const getRadiusValue = (radius: ThemeConfig['cornerRadius']) => {
  if (radius === 'none') return '0px'
  if (radius === 'sm') return '4px'
  if (radius === 'md') return '8px'
  if (radius === 'full') return '9999px'
  return '0px'
}

const getFontStack = (font: ThemeConfig['headingFont']) => {
  if (font === 'Inter') return "'Inter', sans-serif"
  if (font === 'JetBrains Mono') return "'JetBrains Mono', monospace"
  if (font === 'Georgia') return 'Georgia, serif'
  if (font === 'Arial') return 'Arial, sans-serif'
  return "'Inter', sans-serif"
}

const Layout: React.FC<LayoutProps> = ({ children, navLinks, brandName, theme, store, onUpdate, isAdmin }) => {
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const themeStyles = useMemo(() => `
    :root {
      --theme-bg: ${theme.backgroundColor};
      --theme-surface: ${theme.surfaceColor};
      --theme-primary: ${theme.primaryColor};
      --theme-text: ${theme.textColor};
      --theme-radius: ${getRadiusValue(theme.cornerRadius)};
      --theme-heading-font: ${getFontStack(theme.headingFont)};
      --theme-body-font: ${getFontStack(theme.bodyFont)};
      --theme-contrast: ${theme.contrast / 100};
      --theme-font-size: ${theme.fontSize}px;
    }
    body { background-color: var(--theme-bg); color: var(--theme-text); font-family: var(--theme-body-font); font-size: var(--theme-font-size); }
    h1, h2, h3, h4, h5, h6 { font-family: var(--theme-heading-font); }
    .rounded-sm { border-radius: var(--theme-radius) !important; }
    .bg-white { background-color: var(--theme-primary) !important; }
    .bg-black { background-color: var(--theme-bg) !important; }
    .border-white\\/5 { border-color: rgba(255, 255, 255, var(--theme-contrast)) !important; }
    .border-white\\/10 { border-color: rgba(255, 255, 255, calc(var(--theme-contrast) * 2)) !important; }
    .bg-neutral-900\\/50 { background-color: var(--theme-surface) !important; opacity: 0.8; }
    .text-xs { font-size: calc(var(--theme-font-size) * 0.75); }
    .text-sm { font-size: calc(var(--theme-font-size) * 0.875); }
    .text-base { font-size: var(--theme-font-size); }
    .text-lg { font-size: calc(var(--theme-font-size) * 1.125); }
    .text-xl { font-size: calc(var(--theme-font-size) * 1.25); }
  `, [theme])

  const showFloatingChat = !location.pathname.includes('/admin')
  const visibleLinks = navLinks.filter(l => l.visible)

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-500 relative">
      <style>{themeStyles}</style>
      <nav className="sticky top-0 z-50 backdrop-blur-md border-b border-white/5 px-6 py-4" style={{ backgroundColor: `${theme.backgroundColor}cc` }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight hover:opacity-80 transition-opacity z-50 relative" onClick={() => setIsMobileMenuOpen(false)}>
            {brandName}
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {visibleLinks.map(link => (
              <Link key={link.path} to={link.path} className={`text-sm font-medium transition-colors ${location.pathname === link.path ? 'text-white' : 'text-neutral-500 hover:text-white'}`}>
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link to="/admin" className={`text-sm font-medium transition-colors mono uppercase tracking-widest text-xs ${location.pathname === '/admin' ? 'text-white' : 'text-neutral-600 hover:text-white'}`}>
                Admin
              </Link>
            )}
          </div>
          <button className="md:hidden z-50 p-2 text-white focus:outline-none" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} aria-label="Toggle menu">
            <div className={`w-6 h-0.5 bg-white mb-1.5 transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <div className={`w-6 h-0.5 bg-white mb-1.5 transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`} />
            <div className={`w-6 h-0.5 bg-white transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </nav>

      <div className={`fixed inset-0 z-40 bg-black flex flex-col items-center justify-center space-y-8 transition-transform duration-300 md:hidden ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {visibleLinks.map(link => (
          <Link key={link.path} to={link.path} onClick={() => setIsMobileMenuOpen(false)} className={`text-2xl font-bold tracking-tight uppercase mono ${location.pathname === link.path ? 'text-white' : 'text-neutral-500 hover:text-white'}`}>
            {link.label}
          </Link>
        ))}
        {isAdmin && (
          <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="text-2xl font-bold tracking-tight uppercase mono text-neutral-600 hover:text-white">
            Admin
          </Link>
        )}
      </div>

      <main className="flex-grow relative">{children}</main>

      {showFloatingChat && <FloatingAIChat store={store} onUpdate={onUpdate} />}

      <footer className="border-t border-white/5 py-12 px-6" style={{ backgroundColor: theme.surfaceColor }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-neutral-500 text-sm">© {new Date().getFullYear()} {brandName}. All rights reserved.</div>
          <div className="flex gap-6">
            <span className="text-neutral-600 text-xs mono">THEME ENGINE v1.3.3</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout
