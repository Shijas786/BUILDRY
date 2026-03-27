// Format wallet/mint address as 4...4
export const fmtAddr = (addr: string): string =>
  addr ? addr.slice(0, 4) + '…' + addr.slice(-4) : ''

// Format price based on magnitude
export const fmtPrice = (n: number): string => {
  if (n < 0.01) return '$' + n.toFixed(6)
  if (n < 1) return '$' + n.toFixed(4)
  return '$' + n.toFixed(2)
}

// Format large numbers with compact notation
export const fmtNum = (n: number): string =>
  Intl.NumberFormat('en', { notation: 'compact' }).format(n)

// Format percentage change with +/- sign
export const fmtChange = (n: number): string =>
  (n >= 0 ? '+' : '') + n.toFixed(2) + '%'

// Format SOL amount
export const fmtSol = (n: number): string =>
  n.toFixed(4) + ' SOL'

// Format market cap
export const fmtMcap = (n: number): string =>
  '$' + fmtNum(n)
