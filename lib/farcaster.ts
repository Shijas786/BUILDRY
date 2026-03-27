import axios from 'axios'

const NEYNAR_BASE = 'https://api.neynar.com/v2'
const API_KEY = process.env.NEYNAR_API_KEY || ''

const neynarClient = axios.create({
  baseURL: NEYNAR_BASE,
  headers: {
    'accept': 'application/json',
    'api_key': API_KEY,
  },
  timeout: 10000,
})

export interface FarcasterProfile {
  fid: number
  username: string
  displayName: string
  avatar?: string
  bio?: string
  followers: number
  following: number
  verifiedAddresses: string[]
  activeOnFarcaster: boolean
  powerBadge: boolean
}

/**
 * Look up a Farcaster profile by Ethereum/Solana wallet address.
 * Neynar resolves verified addresses linked to Farcaster accounts.
 */
export async function getFarcasterProfileByWallet(
  walletAddress: string
): Promise<FarcasterProfile | null> {
  if (!API_KEY) return getMockProfile(walletAddress)
  try {
    const { data } = await neynarClient.get('/farcaster/user/bulk-by-address', {
      params: { addresses: walletAddress, address_types: 'verified_address' },
    })
    // Response: { [address]: [user, ...] }
    const users = data?.[walletAddress.toLowerCase()] || Object.values(data || {})[0]
    const user = Array.isArray(users) ? users[0] : users
    if (!user) return null
    return normalizeProfile(user)
  } catch {
    return null
  }
}

/**
 * Look up a Farcaster profile by username (for Twitter handle cross-match).
 */
export async function getFarcasterProfileByUsername(
  username: string
): Promise<FarcasterProfile | null> {
  if (!API_KEY) return null
  try {
    const { data } = await neynarClient.get('/farcaster/user/by_username', {
      params: { username: username.replace('@', '') },
    })
    const user = data?.user
    if (!user) return null
    return normalizeProfile(user)
  } catch {
    return null
  }
}

function normalizeProfile(u: Record<string, unknown>): FarcasterProfile {
  const verifications = u.verifications as string[] || []
  const verifiedAddresses = (u.verified_addresses as Record<string, unknown>)
  const ethAddresses = (verifiedAddresses?.eth_addresses as string[]) || []
  const solAddresses = (verifiedAddresses?.sol_addresses as string[]) || []

  return {
    fid: Number(u.fid || 0),
    username: (u.username || '') as string,
    displayName: (u.display_name || u.displayName || '') as string,
    avatar: (u.pfp_url || u.pfp || '') as string,
    bio: ((u.profile as Record<string, unknown>)?.bio as Record<string, unknown>)?.text as string || (u.bio || '') as string,
    followers: Number((u.follower_count || u.followers || 0)),
    following: Number((u.following_count || u.following || 0)),
    verifiedAddresses: [...verifications, ...ethAddresses, ...solAddresses],
    activeOnFarcaster: true,
    powerBadge: !!(u.power_badge),
  }
}

// Mock data for dev when no API key is set
function getMockProfile(wallet: string): FarcasterProfile | null {
  if (wallet.startsWith('Talent')) {
    return {
      fid: 18471,
      username: 'alexbuilds',
      displayName: 'Alex Builder',
      avatar: '',
      bio: 'Building on Solana. Verified builder.',
      followers: 4200,
      following: 310,
      verifiedAddresses: [wallet],
      activeOnFarcaster: true,
      powerBadge: true,
    }
  }
  if (wallet.startsWith('Partial')) {
    return {
      fid: 99201,
      username: 'jdbuilds',
      displayName: 'JD',
      avatar: '',
      bio: '',
      followers: 820,
      following: 140,
      verifiedAddresses: [wallet],
      activeOnFarcaster: true,
      powerBadge: false,
    }
  }
  return null
}
