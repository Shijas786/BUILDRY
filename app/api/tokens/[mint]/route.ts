import { NextRequest, NextResponse } from 'next/server'
import type { BagsToken } from '@/lib/bags'
import { getToken } from '@/lib/bags'
import { primaryWalletsFromProfile } from '@/lib/builderProfileWallets'
import { enrichTokenFromDexscreener } from '@/lib/dexscreenerTokenEnrich'
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'
import { FS } from '@/lib/firestoreCollections'
import { readUserTokenLaunchByMint } from '@/lib/userTokenLaunchRecord'

function syntheticTokenFromRegistry(
  mint: string,
  reg: { name: string; symbol: string },
  creatorWallet: string | null
): BagsToken {
  const m = mint.trim()
  return {
    mint: m,
    name: reg.name || reg.symbol || 'Token',
    symbol: (reg.symbol || 'TKN').toUpperCase(),
    price: 0,
    priceChange24h: 0,
    marketCap: 0,
    volume24h: 0,
    ...(creatorWallet ? { creatorWallet } : {}),
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { mint: string } }
) {
  const { mint } = params
  const m = (mint || '').trim()

  let raw = await getToken(mint)

  let registryUid: string | null = null
  if (isFirebaseAdminConfigured && adminDb && m) {
    const reg = await readUserTokenLaunchByMint(adminDb, m)
    if (reg) {
      registryUid = reg.uid
      const profSnap = await adminDb.collection(FS.BUILDER_PROFILES).doc(reg.uid).get()
      const sol = primaryWalletsFromProfile((profSnap.data() || {}) as Record<string, unknown>).sol_wallet

      if (!raw) {
        raw = syntheticTokenFromRegistry(m, { name: reg.name, symbol: reg.symbol }, sol)
      } else {
        const cw = raw.creatorWallet?.trim()
        if (!cw && sol) {
          raw = { ...raw, creatorWallet: sol }
        }
        if ((!raw.name || raw.name === 'Unknown Token') && reg.name) {
          raw = { ...raw, name: reg.name }
        }
        const sym = (raw.symbol || '').toUpperCase()
        if ((!sym || sym === 'UNK') && reg.symbol) {
          raw = { ...raw, symbol: reg.symbol.toUpperCase() }
        }
      }
    }
  }

  if (!raw) {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 })
  }

  const token = await enrichTokenFromDexscreener(raw)

  return NextResponse.json(
    registryUid ? { ...token, buildry_launcher_uid: registryUid } : token,
    {
      headers: { 'Cache-Control': 'private, max-age=15, stale-while-revalidate=30' },
    }
  )
}
