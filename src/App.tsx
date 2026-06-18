import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { getStore } from './store'
import { ContentStore } from './types'
import { supabase } from './lib/supabase'
import Layout from './components/Layout'
import Home from './modules/Home'
import About from './modules/About'
import Work from './modules/Work'
import Community from './modules/Community'
import Connect from './modules/Connect'
import AIConcierge from './modules/AIConcierge'
import AdminPanel from './components/AdminPanel'
import Blog from './modules/Blog'
import Podcast from './modules/Podcast'

const ScrollToTop = () => {
  const { pathname } = useLocation()
  useEffect(() => {
    if (!pathname.includes('/admin')) window.scrollTo(0, 0)
  }, [pathname])
  return null
}

const App: React.FC = () => {
  const [store, setStore] = useState<ContentStore | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      if (supabase) {
        const [initialStore, { data: { session } }] = await Promise.all([
          getStore(),
          supabase.auth.getSession(),
        ])
        setStore(initialStore)
        setIsAdmin(session?.user?.email === 'm@alone.ltd')
      } else {
        setStore(await getStore())
      }
      setLoading(false)
    }
    init()

    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(session?.user?.email === 'm@alone.ltd')
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading || !store) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-xs uppercase tracking-[0.5em] text-neutral-700 animate-pulse mono">
          Initializing Protocol...
        </div>
      </div>
    )
  }

  return (
    <Router>
      <ScrollToTop />
      <Layout
        navLinks={store.navigation}
        brandName={store.brand.name}
        theme={store.theme}
        store={store}
        onUpdate={setStore}
        isAdmin={isAdmin}
      >
        <Routes>
          <Route path="/" element={<Home store={store} />} />
          <Route path="/about" element={<About store={store} />} />
          <Route path="/work" element={<Work store={store} />} />
          <Route path="/community" element={<Community store={store} />} />
          <Route path="/connect" element={<Connect store={store} />} />
          <Route path="/ai" element={<AIConcierge store={store} />} />
          <Route path="/blog" element={<Blog store={store} />} />
          <Route path="/blog/:slug" element={<Blog store={store} />} />
          <Route path="/podcast" element={<Podcast store={store} />} />
          <Route path="/podcast/:slug" element={<Podcast store={store} />} />
          <Route path="/admin" element={<AdminPanel store={store} onUpdate={setStore} isAdmin={isAdmin} />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
