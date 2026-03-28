import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

/** Lazy client for modules that expect a singleton; only construct when env is set. */
export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  if (!_client) _client = createClient(url, key)
  return _client
}

// Example Database Types (to be mapped precisely to the schema later)
export type BuilderProfile = {
  id: string
  user_id: string
  username: string
  overall_score: number
  reputation_tier: string
}
