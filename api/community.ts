import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, fields } = req.body
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'email required' })
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { error } = await supabase
    .from('hub_community_members')
    .insert({ email: email.trim().toLowerCase(), meta: fields || {} })

  if (error) {
    if (error.code === '23505') {
      return res.status(200).json({ ok: true, message: 'Already registered' })
    }
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ ok: true })
}
