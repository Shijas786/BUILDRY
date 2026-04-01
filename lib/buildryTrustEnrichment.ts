import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'
import { allVerifiedWalletsFromProfile } from '@/lib/builderProfileWallets'
import { claimDocId, normalizeSolWallet } from '@/lib/walletNormalize'
import { FS } from '@/lib/firestoreCollections'

/** Legacy fallback when `wallet_address_claims` has no row (older data). */
const SCAN_LIMIT = 400

export type BuildryTrustSnapshot = {
  username: string
  displayName: string
  profileHref: string
  avatarUrl?: string
  githubLogin?: string
  githubVerified: boolean
  twitterHandle?: string
}

function snapshotFromProfileData(data: Record<string, unknown>): BuildryTrustSnapshot | null {
  const u = typeof data.username === 'string' ? data.username.trim().toLowerCase() : ''
  if (u.length < 3) return null

  const display =
    (typeof data.name === 'string' && data.name.trim()) ||
    (typeof data.username === 'string' && data.username.trim()) ||
    'Builder'
  const gh = typeof data.github_username === 'string' ? data.github_username.trim() : ''
  const tw = typeof data.twitter_handle === 'string' ? data.twitter_handle.replace(/^@/, '').trim() : ''

  return {
    username: u,
    displayName: display,
    profileHref: `/profile/${encodeURIComponent(u)}`,
    avatarUrl: typeof data.avatar_url === 'string' ? data.avatar_url : undefined,
    githubLogin: gh || undefined,
    githubVerified: data.github_verified === true,
    twitterHandle: tw || undefined,
  }
}

/**
 * Resolve Buildry builder for a Solana wallet: `wallet_address_claims` (written on link) first,
 * then a bounded scan of `builder_profiles` for legacy rows without a claim doc.
 */
export async function getBuildryTrustSnapshotForSolWallet(
  wallet: string
): Promise<BuildryTrustSnapshot | null> {
  const want = normalizeSolWallet(wallet)
  if (!want || !isFirebaseAdminConfigured || !adminDb) return null

  try {
    const claimSnap = await adminDb
      .collection(FS.WALLET_ADDRESS_CLAIMS)
      .doc(claimDocId('sol', want))
      .get()

    if (claimSnap.exists) {
      const userId = (claimSnap.data() as { user_id?: string })?.user_id
      if (userId && typeof userId === 'string') {
        const profSnap = await adminDb.collection(FS.BUILDER_PROFILES).doc(userId).get()
        if (profSnap.exists) {
          const data = profSnap.data() as Record<string, unknown>
          const sols = allVerifiedWalletsFromProfile(data).solAddresses
            .map((a) => normalizeSolWallet(a))
            .filter((x): x is string => !!x)
          if (sols.includes(want)) {
            const snap = snapshotFromProfileData(data)
            if (snap) return snap
          }
        }
      }
    }

    const collSnap = await adminDb.collection(FS.BUILDER_PROFILES).limit(SCAN_LIMIT).get()
    for (const d of collSnap.docs) {
      const data = d.data() as Record<string, unknown>
      const sols = allVerifiedWalletsFromProfile(data).solAddresses
        .map((a) => normalizeSolWallet(a))
        .filter((x): x is string => !!x)
      if (!sols.includes(want)) continue
      const snap = snapshotFromProfileData(data)
      if (snap) return snap
    }
  } catch (e) {
    console.error('getBuildryTrustSnapshotForSolWallet:', e)
  }
  return null
}
