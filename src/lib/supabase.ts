import { createClient } from '@supabase/supabase-js'
import { resilientFetch, markDbUnconfigured } from './dbStatus'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

function isValidUrl(s?: string): boolean {
  if (!s) return false
  try { return new URL(s).protocol.startsWith('http') } catch { return false }
}

// Supabase is optional — site shows public content without it; admin features require it.
// Every request goes through resilientFetch: 4s cap, no slow retries, instant fail when offline.
export const supabase = (isValidUrl(url) && key && key.length > 10)
  ? createClient(url!, key, { global: { fetch: resilientFetch } })
  : null

if (!supabase) markDbUnconfigured()
