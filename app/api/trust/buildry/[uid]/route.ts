import { NextRequest, NextResponse } from 'next/server'
import { primaryWalletsFromProfile } from '@/lib/builderProfileWallets'
import { getBuildryTrustSnapshotForUid } from '@/lib/buildryTrustEnrichment'
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'
import { FS } from '@/lib/firestoreCollections'
import { getProfile } from '@/lib/talent'
import { getFarcasterProfileByWallet, getFarcasterProfileByUsername } from '@/lib/farcaster'
import { getTokensByCreator } from '@/lib/bags'
import { buildTrustData, getHeliusTransactions } from '@/lib/trust'

/**
 * Trust card for a known Buildry launcher (Firebase uid), e.g. from `user_token_launches`.
 * Avoids requiring the on-chain creator wallet to match verified Sol for display.
 */
export async function GET(req: NextRequest, { params }: { params: { uid: string } }) {
  const uid = (params.uid || '').trim()
  if (!uid) {
    return NextResponse.json({ error: 'Missing uid' }, { status: 400 })
  }

  const twitterQP = req.nextUrl.searchParams.get('twitter') || null
  const bagsAvatar = req.nextUrl.searchParams.get('avatar') || null

  const buildry = await getBuildryTrustSnapshotForUid(uid)

  let primarySol: string | null = null
  if (isFirebaseAdminConfigured && adminDb) {
    const profSnap = await adminDb.collection(FS.BUILDER_PROFILES).doc(uid).get()
    primarySol = primaryWalletsFromProfile((profSnap.data() || {}) as Record<string, unknown>).sol_wallet
  }

  const walletForSignals = primarySol?.trim() || ''

  const [profile, bagsProjects, heliusTxns] = await Promise.all([
    walletForSignals ? getProfile(walletForSignals) : Promise.resolve(null),
    walletForSignals ? getTokensByCreator(walletForSignals) : Promise.resolve([]),
    walletForSignals ? getHeliusTransactions(walletForSignals) : Promise.resolve(0),
  ])

  const twitterMerged = twitterQP || buildry?.twitterHandle || null

  const farcaster = walletForSignals
    ? await getFarcasterProfileByWallet(walletForSignals).then(async (f) => {
        if (f) return f
        if (twitterMerged) return getFarcasterProfileByUsername(twitterMerged)
        return null
      })
    : twitterMerged
      ? await getFarcasterProfileByUsername(twitterMerged)
      : null

  const trustData = buildTrustData(
    profile,
    twitterMerged,
    farcaster,
    bagsProjects,
    bagsAvatar,
    heliusTxns,
    buildry
  )

  return NextResponse.json(trustData, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  })
}
