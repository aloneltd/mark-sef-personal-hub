import React from 'react'
import { Link } from 'react-router-dom'

// Catch-all for any URL that doesn't match a route: a stale bookmark, a typo, an old deep link.
// Without this, React Router renders the Layout chrome with an empty <main> — a blank-looking
// dead end. This gives the visitor a friendly message and a way back instead.
const NotFound: React.FC = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6 py-20 gap-6">
    <div className="text-[10px] mono uppercase tracking-[0.4em] text-neutral-600">404</div>
    <h1 className="text-3xl md:text-5xl font-bold italic tracking-tight">Page Not Found</h1>
    <p className="text-neutral-500 max-w-md">
      This link doesn't lead anywhere — the page may have moved or the address was mistyped.
    </p>
    <Link
      to="/"
      className="mt-4 text-xs uppercase mono tracking-widest text-neutral-300 hover:text-white transition-colors border border-white/10 px-6 py-3 rounded-sm hover:bg-white/5"
    >
      ← Back to Home
    </Link>
  </div>
)

export default NotFound
