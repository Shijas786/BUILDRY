import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getProviderField(provider: string): { key: string; verifiedKey?: string } | null {
  if (provider === 'github') return { key: 'github_username', verifiedKey: 'github_verified' }
  if (provider === 'twitter') return { key: 'twitter_handle' }
  if (provider === 'linkedin_oidc') return { key: 'linkedin_url' }
  return null
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const provider = url.searchParams.get('provider') || ''
  const origin = url.origin

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  if (!supabaseUrl || !supabaseKey || !code) {
    return NextResponse.redirect(`${origin}/settings?oauth=error`)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !data.session?.user) {
    return NextResponse.redirect(`${origin}/settings?oauth=error`)
  }

  const user = data.session.user
  const mapping = getProviderField(provider)
  if (!mapping) return NextResponse.redirect(`${origin}/settings?oauth=unknown_provider`)

  const identity = (user.identities || []).find((i: any) => i.provider === provider)
  const idData = (identity?.identity_data || {}) as any
  const value =
    idData.user_name ||
    idData.preferred_username ||
    idData.nickname ||
    idData.name ||
    idData.email ||
    null

  if (!value) return NextResponse.redirect(`${origin}/settings?oauth=no_identity`)

  const payload: Record<string, any> = {
    user_id: user.id,
    [mapping.key]: value,
  }
  if (mapping.verifiedKey) payload[mapping.verifiedKey] = true

  await supabase.from('builder_profiles').upsert(payload, { onConflict: 'user_id' })

  return NextResponse.redirect(`${origin}/settings?oauth=connected&provider=${provider}`)
}

