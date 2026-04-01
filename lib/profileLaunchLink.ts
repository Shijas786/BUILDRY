/**
 * When a user launches via Buildry, we store the mint on their profile so APIs and UI
 * don't need Bags/Dex heuristics to find "their" token.
 */
export type ProfileLaunchDocFields = {
  has_launched_token: true
  bags_primary_mint: string
  last_launch_mint: string
  last_launch_name: string
  last_launch_symbol: string
  last_launch_at: number
}

export function buildProfileLaunchUpdate(
  mint: string,
  name: string,
  symbol: string,
  atMs: number = Date.now()
): Partial<ProfileLaunchDocFields> | null {
  const m = mint.trim()
  if (!m) return null
  const sym = symbol.trim().toUpperCase() || 'TOKEN'
  const n = (name.trim() || sym).slice(0, 200)
  return {
    has_launched_token: true,
    bags_primary_mint: m,
    last_launch_mint: m,
    last_launch_name: n,
    last_launch_symbol: sym,
    last_launch_at: atMs,
  }
}

export function launchFromProfileData(data: Record<string, unknown> | undefined | null): {
  mint: string
  name: string
  symbol: string
  created_at: number
} | null {
  if (!data) return null
  const mint =
    (typeof data.last_launch_mint === 'string' && data.last_launch_mint.trim()) ||
    (typeof data.bags_primary_mint === 'string' && data.bags_primary_mint.trim()) ||
    ''
  if (!mint) return null
  const symbol =
    (typeof data.last_launch_symbol === 'string' && data.last_launch_symbol.trim().toUpperCase()) || 'TOKEN'
  const name =
    (typeof data.last_launch_name === 'string' && data.last_launch_name.trim()) || symbol
  const at = typeof data.last_launch_at === 'number' && Number.isFinite(data.last_launch_at) ? data.last_launch_at : 0
  return { mint, name, symbol, created_at: at || Date.now() }
}
