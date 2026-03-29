/**
 * Small chain logos for profile activity breakdowns (external CDN, plain <img>).
 * @see https://icons.llamao.fi (DefiLlama chain icons)
 */

const LLAMA = 'https://icons.llamao.fi/icons/chains'

/** Map our API slugs / labels to DefiLlama `rsz_{key}.jpg` keys. */
const SLUG_TO_LLAMA: Record<string, string> = {
  'eth-mainnet': 'ethereum',
  'etherscan-mainnet': 'ethereum',
  'base-mainnet': 'base',
  'arb-mainnet': 'arbitrum',
  'opt-mainnet': 'optimism',
  'polygon-mainnet': 'polygon',
  'linea-mainnet': 'linea',
  'scroll-mainnet': 'scroll',
  'zksync-mainnet': 'zksync',
  'blast-mainnet': 'blast',
  'arb-nova-mainnet': 'arbitrum_nova',
  'mantle-mainnet': 'mantle',
  'metis-mainnet': 'metis',
  'opbnb-mainnet': 'op_bnb',
  'bnb-mainnet': 'bsc',
  'avax-mainnet': 'avalanche',
  'fantom-mainnet': 'fantom',
  'celo-mainnet': 'celo',
  'gnosis-mainnet': 'gnosis',
  'worldchain-mainnet': 'world_chain',
  'shape-mainnet': 'shape',
  'zetachain-mainnet': 'zeta',
  solana: 'solana',
}

const SOLANA_ICON =
  'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png'

export function chainIconSrc(slug: string | undefined | null): string | undefined {
  if (!slug) return undefined
  if (slug === 'solana') return SOLANA_ICON
  const key = SLUG_TO_LLAMA[slug]
  if (!key) return undefined
  return `${LLAMA}/rsz_${key}.jpg`
}
