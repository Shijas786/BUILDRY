import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'
import { allVerifiedWalletsFromProfile } from '@/lib/builderProfileWallets'
import { normalizeSolWallet } from '@/lib/walletNormalize'
import { FS } from '@/lib/firestoreCollections'

export type BuildryWalletMeta = {
  username: string
  display_name: string
  profileHref: string
}

const SCAN_LIMIT = 400

/**
 * Maps normalized Solana wallet → public builder profile (verified / primary wallet on Buildry).
 */
export async function loadBuildrySolWalletLookup(): Promise<Map<string, BuildryWalletMeta>> {
  const map = new Map<string, BuildryWalletMeta>()
  if (!isFirebaseAdminConfigured || !adminDb) return map

  try {
    const snap = await adminDb.collection(FS.BUILDER_PROFILES).limit(SCAN_LIMIT).get()
    for (const d of snap.docs) {
      const data = d.data() as Record<string, unknown>
      const u = typeof data.username === 'string' ? data.username.trim().toLowerCase() : ''
      if (u.length < 3) continue
      const display =
        (typeof data.name === 'string' && data.name.trim()) ||
        (typeof data.username === 'string' && data.username.trim()) ||
        'Builder'
      const meta: BuildryWalletMeta = {
        username: u,
        display_name: display,
        profileHref: `/profile/${encodeURIComponent(u)}`,
      }
      for (const addr of allVerifiedWalletsFromProfile(data).solAddresses) {
        const norm = normalizeSolWallet(addr)
        if (norm) map.set(norm, meta)
      }
    }
  } catch (e) {
    console.error('loadBuildrySolWalletLookup:', e)
  }
  return map
}
