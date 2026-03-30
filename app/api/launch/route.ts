import { NextResponse } from 'next/server'

/** @deprecated Demo only. Production launches use `/launch` → `prepareBagsLaunchFeeShare` + wallet fee-share txs + `prepareBagsLaunchDeployTx` (Bags SDK v2). */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, symbol, description, builderTwitter, walletAddress, creatorOwnershipUsd, creatorOwnershipPct } = body

    if (!name || !symbol) {
      return NextResponse.json({ success: false, error: 'Missing required token fields.' }, { status: 400 })
    }

    // Simulated fee split (real launches use app/actions/bags.ts + PLATFORM_FEE_BPS).
    const bagsFeeConfig = {
      tokenMint: 'derived_mint_address',
      feeClaimers: [
        {
          provider: 'wallet',
          address: 'REPU_TREASURY_STAKE_ADDRESS',
          bps: 100 // 1% protocol fee share
        },
        {
          provider: 'twitter',
          id: builderTwitter || 'unknown',
          bps: 9900 // remainder to builder side of the split
        }
      ]
    }

    console.log('[Bags API SDK V3]', 'Creating fee share config:', bagsFeeConfig)
    if (creatorOwnershipUsd != null || creatorOwnershipPct != null) {
      console.log('[Launch] Creator pre-buy (ownership)', {
        creatorOwnershipUsd: typeof creatorOwnershipUsd === 'number' ? creatorOwnershipUsd : Number(creatorOwnershipUsd) || 0,
        creatorOwnershipPct: creatorOwnershipPct ?? null,
      })
    }

    // Simulate Network Delay for Metadata Upload & Bundle Creation
    await new Promise(resolve => setTimeout(resolve, 2500))

    // Generate a simulated transaction/mint
    const simulatedMint = `BagsDeploy${Math.random().toString(36).substring(2, 10).toUpperCase()}`

    return NextResponse.json({
      success: true,
      mint: simulatedMint,
      message: 'Token successfully bundled with V3 Fee Config.',
      config: bagsFeeConfig,
      creatorOwnershipUsd: typeof creatorOwnershipUsd === 'number' ? creatorOwnershipUsd : Number(creatorOwnershipUsd) || 0,
      creatorOwnershipPct: creatorOwnershipPct ?? null,
    })

  } catch (error) {
    console.error('Launch Error:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
