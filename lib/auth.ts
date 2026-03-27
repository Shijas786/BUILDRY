import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

export type UserRole = 'developer' | 'founder' | 'investor' | 'recruiter'

export interface AppUser {
  id: string
  email: string | null
  name: string | null
  avatar_url: string | null
  account_type: UserRole | null
  wallet_address: string | null
  created_at: string
}

export function createAuthClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null
  return createClient(supabaseUrl, supabaseAnonKey)
}

export async function getSession() {
  const supabase = createAuthClient()
  if (!supabase) return null
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) return null
  return session
}

export async function getUser(): Promise<AppUser | null> {
  const supabase = createAuthClient()
  if (!supabase) return null
  const session = await getSession()
  if (!session?.user) return null

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (error || !data) return null
  return data as AppUser
}

export async function signUpWithEmail(email: string, password: string) {
  const supabase = createAuthClient()
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } }
  return supabase.auth.signUp({ email, password })
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = createAuthClient()
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } }
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signInWithGoogle() {
  const supabase = createAuthClient()
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } }
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback` },
  })
}

export async function signOut() {
  const supabase = createAuthClient()
  if (!supabase) return { error: null }
  return supabase.auth.signOut()
}

export async function updateUserRole(userId: string, role: UserRole) {
  const supabase = createAuthClient()
  if (!supabase) return { data: null, error: null }
  return supabase.from('users').update({ account_type: role }).eq('id', userId)
}
