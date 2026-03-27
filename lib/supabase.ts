import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Export a singleton instance of the Supabase client
// Note: This will silently fail or throw network errors if environment variables are missing
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Example Database Types (to be mapped precisely to the schema later)
export type BuilderProfile = {
  id: string
  user_id: string
  username: string
  overall_score: number
  reputation_tier: string
}
