// Supabase Realtime client for Rolligan web join (join-only, broadcast channels).
// Broadcast needs only the anon key — no DB tables or RLS are involved.
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase =
  url && anon
    ? createClient(url, anon, { realtime: { params: { eventsPerSecond: 10 } } })
    : null

/** Channel name shared with the iOS host. Must match MULTIPLAYER.md. */
export const roomChannel = (code) => `rolligan:room:${code.toUpperCase()}`
