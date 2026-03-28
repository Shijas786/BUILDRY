import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** Server-side Supabase; null when env is missing (avoids build-time throws on Vercel). */
export function getServiceSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}
