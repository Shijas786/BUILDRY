import { LAMPORTS_PER_SOL } from '@solana/web3.js'

const COINGECKO_SOL_USD =
  'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'

/** SOL per 1 USD at launch time (CoinGecko, same source as the ownership panel hint). */
export async function fetchSolUsdForLaunch(): Promise<number> {
  const r = await fetch(COINGECKO_SOL_USD)
  if (!r.ok) {
    throw new Error('Could not load SOL/USD price. Try again in a moment.')
  }
  const j = (await r.json()) as { solana?: { usd?: number } }
  const p = j?.solana?.usd
  if (typeof p !== 'number' || !(p > 0)) {
    throw new Error('SOL/USD price unavailable. Try again in a moment.')
  }
  return p
}

/**
 * Creator initial buy for Bags `initialBuyLamports` (whole lamports, floored).
 * Returns 0 if `usd <= 0`.
 */
export function usdToInitialBuyLamports(usd: number, solUsd: number): number {
  if (!Number.isFinite(usd) || usd <= 0) return 0
  if (!Number.isFinite(solUsd) || solUsd <= 0) return 0
  const sol = usd / solUsd
  return Math.max(0, Math.floor(sol * LAMPORTS_PER_SOL))
}
