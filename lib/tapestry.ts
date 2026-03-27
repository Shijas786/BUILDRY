import axios from 'axios'

const TAPESTRY_BASE = 'https://api.usetapestry.dev/v1'
const API_KEY = process.env.TAPESTRY_API_KEY || ''

const tapestryClient = axios.create({
  baseURL: TAPESTRY_BASE,
  timeout: 10000,
})

export interface TapestryProfile {
  id: string
  walletAddress?: string
  twitterHandle?: string
  username?: string
  displayName?: string
  avatar?: string
  bio?: string
  followers?: number
  following?: number
  // Social accounts linked
  farcaster?: string
  lens?: string
  bluesky?: string
  // Networks the user is active on
  networks?: string[]
}

/**
 * Find or create a Tapestry profile by wallet address.
 * Returns enriched social graph data including cross-platform identities.
 */
export async function getTapestryProfile(
  walletAddress: string
): Promise<TapestryProfile | null> {
  if (!API_KEY || !walletAddress) return getMockTapestryProfile(walletAddress)

  try {
    const { data } = await tapestryClient.get('/profiles/findOrCreate', {
      params: {
        walletAddress,
        apiKey: API_KEY,
      },
    })

    const p = data?.profile || data
    if (!p) return null

    return normalizeTapestryProfile(p)
  } catch (err: unknown) {
    const error = err as { response?: { status?: number } }
    // 404 → no profile found, degrade gracefully
    if (error?.response?.status === 404) return null
    return getMockTapestryProfile(walletAddress)
  }
}

/**
 * Look up a Tapestry profile by Twitter handle (used as foreign key).
 * Bags users sign in with Twitter → perfect cross-app identifier.
 */
export async function getTapestryProfileByTwitter(
  twitterHandle: string
): Promise<TapestryProfile | null> {
  if (!API_KEY || !twitterHandle) return null

  try {
    const { data } = await tapestryClient.get('/profiles/findOrCreate', {
      params: {
        twitterHandle: twitterHandle.replace('@', ''),
        apiKey: API_KEY,
      },
    })

    const p = data?.profile || data
    if (!p) return null

    return normalizeTapestryProfile(p)
  } catch {
    return null
  }
}

function normalizeTapestryProfile(p: Record<string, unknown>): TapestryProfile {
  const socials = (p.socials as Record<string, unknown>) || {}
  return {
    id: (p.id || p.profileId || '') as string,
    walletAddress: (p.walletAddress || p.wallet || '') as string,
    twitterHandle: (p.twitterHandle || (socials.twitter as string) || '') as string,
    username: (p.username || p.handle || '') as string,
    displayName: (p.displayName || p.name || '') as string,
    avatar: (p.avatar || p.profileImage || '') as string,
    bio: (p.bio || p.description || '') as string,
    followers: Number(p.followers || (socials.twitterFollowers as number) || 0),
    following: Number(p.following || 0),
    farcaster: (p.farcaster || (socials.farcaster as string) || '') as string,
    lens: (p.lens || (socials.lens as string) || '') as string,
    bluesky: (p.bluesky || (socials.bluesky as string) || '') as string,
    networks: (p.networks as string[]) || [],
  }
}

// Mock data for dev (falls back when no API key)
function getMockTapestryProfile(wallet: string): TapestryProfile | null {
  if (wallet.startsWith('Talent')) {
    return {
      id: 'tap_alice_001',
      walletAddress: wallet,
      twitterHandle: 'alexbuilds',
      username: 'alexbuilds',
      displayName: 'Alex Builder',
      avatar: '',
      bio: 'Building on Solana. Verified on Talent Protocol.',
      followers: 8400,
      following: 420,
      farcaster: 'alexbuilds',
      lens: 'alexbuilds.lens',
      bluesky: 'alexbuilds.bsky.social',
      networks: ['solana', 'farcaster', 'lens', 'bluesky'],
    }
  }
  if (wallet.startsWith('Partial')) {
    return {
      id: 'tap_jd_002',
      walletAddress: wallet,
      twitterHandle: 'jdbuilds',
      username: 'jdbuilds',
      displayName: 'JD',
      avatar: '',
      bio: '',
      followers: 12400,
      following: 890,
      farcaster: '',
      lens: '',
      bluesky: '',
      networks: ['twitter'],
    }
  }
  return null
}
