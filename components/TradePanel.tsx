'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { BagsToken } from '@/lib/bags'
import { TrustData } from '@/lib/trust'
import { useTradeQuote } from '@/hooks/useTradeQuote'
import { fmtNum, fmtSol } from '@/lib/format'
import ConfirmModal from './ConfirmModal'
import PriceChart from './PriceChart'

import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { deserializeSwapTransactionFromBagsPayload } from '@/lib/deserializeSwapTransaction'

const SOL_MINT = 'So11111111111111111111111111111111111111112'
const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  process.env.SOLANA_RPC_URL ||
  'https://api.mainnet-beta.solana.com'

/** When using 100% SOL on a buy, keep this much for fees / rent so the swap is less likely to fail. */
const SOL_MAX_SLACK = 0.025

function formatAmountInput(n: number, maxFractionDigits = 9): string {
  if (!Number.isFinite(n) || n <= 0) return ''
  return n.toFixed(maxFractionDigits).replace(/\.?0+$/, '').replace(/\.$/, '') || '0'
}

interface TradePanelProps {
  token: BagsToken
  trust: TrustData | null
  trustLoading: boolean
  /** Hide embedded chart (e.g. token page shows holders instead). */
  hideChart?: boolean
}

export default function TradePanel({ token, trust, trustLoading, hideChart }: TradePanelProps) {
  const { connection } = useConnection()
  const { connected, publicKey, sendTransaction, signTransaction } = useWallet()
  const { setVisible } = useWalletModal()
  const [solBalance, setSolBalance] = useState<number | null>(null)
  /** Connected wallet balance of this page’s token (all SPL accounts for mint). */
  const [tokenWalletBalance, setTokenWalletBalance] = useState<number | null>(null)
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [amount, setAmount] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [txLoading, setTxLoading] = useState(false)
  const [txStatus, setTxStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [txError, setTxError] = useState<string | null>(null)

  const inputMint = side === 'buy' ? SOL_MINT : token.mint
  const outputMint = side === 'buy' ? token.mint : SOL_MINT
  const amountNum = parseFloat(amount) || 0

  const { quote, loading: quoteLoading } = useTradeQuote(
    inputMint,
    outputMint,
    amountNum,
    side
  )

  const refreshSolBalance = useCallback(() => {
    if (!connected || !publicKey) {
      setSolBalance(null)
      return
    }
    connection
      .getBalance(publicKey)
      .then((lamports) => setSolBalance(lamports / LAMPORTS_PER_SOL))
      .catch(() => setSolBalance(null))
  }, [connection, connected, publicKey])

  const refreshTokenWalletBalance = useCallback(() => {
    if (!connected || !publicKey || !token.mint?.trim()) {
      setTokenWalletBalance(null)
      return
    }
    let mintPk: PublicKey
    try {
      mintPk = new PublicKey(token.mint.trim())
    } catch {
      setTokenWalletBalance(null)
      return
    }
    connection
      .getParsedTokenAccountsByOwner(publicKey, { mint: mintPk }, 'confirmed')
      .then((res) => {
        let sum = 0
        for (const { account } of res.value) {
          const data = account.data
          if (data?.program !== 'spl-token' || !data.parsed || typeof data.parsed !== 'object') continue
          const info = (data.parsed as { info?: { tokenAmount?: { uiAmount?: number | null; uiAmountString?: string } } })
            .info
          const ta = info?.tokenAmount
          if (!ta) continue
          const ui =
            typeof ta.uiAmount === 'number' && Number.isFinite(ta.uiAmount)
              ? ta.uiAmount
              : ta.uiAmountString != null
                ? parseFloat(String(ta.uiAmountString))
                : 0
          if (Number.isFinite(ui)) sum += ui
        }
        setTokenWalletBalance(sum)
      })
      .catch(() => setTokenWalletBalance(null))
  }, [connection, connected, publicKey, token.mint])

  const refreshWalletBalances = useCallback(() => {
    refreshSolBalance()
    refreshTokenWalletBalance()
  }, [refreshSolBalance, refreshTokenWalletBalance])

  useEffect(() => {
    refreshWalletBalances()
    const t = setInterval(refreshWalletBalances, 12_000)
    return () => clearInterval(t)
  }, [refreshWalletBalances])

  const tier = trust?.tier
  const tier_ready = !trustLoading && !!trust
  /** Disconnected users must still be able to open the wallet modal (do not disable the primary button). */
  const primaryDisabled =
    txLoading || (connected && (trustLoading || !tier_ready || quoteLoading || amountNum <= 0 || !quote))
  const priceImpact = quote?.priceImpactPct ?? 0

  const getSwapButtonStyle = () => {
    if (!tier_ready || tier === 'VERIFIED' || !tier) {
      return { background: 'var(--accent-primary)', color: '#000', boxShadow: '0 0 20px rgba(0,212,255,0.3)' }
    }
    if (tier === 'PARTIAL') {
      return { background: 'var(--accent-amber)', color: '#000', boxShadow: '0 0 20px rgba(255,184,0,0.3)' }
    }
    return { background: 'var(--accent-red)', color: '#fff', boxShadow: '0 0 20px rgba(255,59,48,0.3)' }
  }

  const getSwapButtonText = () => {
    if (!connected) return 'Connect Wallet'
    if (quoteLoading) return 'Getting Quote…'
    if (trustLoading) return 'Checking Creator…'
    if (!amountNum) return 'Enter Amount'
    return 'Swap'
  }

  const flipPayingReceiving = () => {
    setSide((s) => (s === 'buy' ? 'sell' : 'buy'))
    setAmount('')
  }

  const applyPayingPercent = (pct: 25 | 50 | 75 | 100) => {
    if (!connected || !publicKey) return
    const frac = pct / 100
    if (side === 'buy') {
      if (solBalance == null || solBalance <= 0) return
      const spend =
        pct === 100 ? Math.max(0, solBalance - SOL_MAX_SLACK) : solBalance * frac
      if (spend <= 0) return
      setAmount(formatAmountInput(spend, 9))
      return
    }
    if (tokenWalletBalance == null || tokenWalletBalance <= 0) return
    const spend = tokenWalletBalance * frac
    if (spend <= 0) return
    setAmount(formatAmountInput(spend, 8))
  }

  const canUsePayingPercents =
    connected &&
    publicKey &&
    (side === 'buy'
      ? solBalance != null && solBalance > 0
      : tokenWalletBalance != null && tokenWalletBalance > 0)

  const hundredPercentDisabled =
    side === 'buy' && solBalance != null && solBalance <= SOL_MAX_SLACK

  const handleSwap = async () => {
    if (!connected) { setVisible(true); return }
    if (tier === 'ANONYMOUS') { setShowConfirm(true); return }
    await doSwap()
  }

  const doSwap = async () => {
    if (!publicKey || !quote?.bagsResponse) return
    setShowConfirm(false)
    setTxLoading(true)
    setTxStatus('idle')
    setTxError(null)

    try {
      // 1. Get serialized transaction from our API
      const swapRes = await fetch('/api/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quote.bagsResponse,
          userPublicKey: publicKey.toString(),
        })
      })
      const swapData = await swapRes.json()
      if (swapData.error) throw new Error(swapData.error)
      const raw = swapData.swapTransaction
      if (typeof raw !== 'string') throw new Error('Invalid swap response from server')

      const transaction = deserializeSwapTransactionFromBagsPayload(raw)

      const connection = new Connection(RPC_URL)
      let signature: string
      if (sendTransaction) {
        signature = await sendTransaction(transaction, connection)
      } else if (signTransaction) {
        const signed = await signTransaction(transaction)
        signature = await connection.sendRawTransaction(signed.serialize(), {
          skipPreflight: false,
          maxRetries: 3,
        })
      } else {
        throw new Error('Wallet cannot sign transactions')
      }

      // 4. Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed')
      
      setTxStatus('success')
      refreshWalletBalances()
      setTimeout(() => setTxStatus('idle'), 5000)
    } catch (err: any) {
      console.error('Swap Error:', err)
      setTxStatus('error')
      setTxError(err.message || 'Transaction failed')
    } finally {
      setTxLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
        <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-black mb-4">
          Trade Execution
        </div>

        {/* Buy/Sell tabs */}
        <div className="flex bg-[var(--bg-tertiary)] rounded-xl p-1 mb-6 w-fit border border-[var(--border)]">
          {(['buy', 'sell'] as const).map(s => (
            <button
              key={s}
              onClick={() => { setSide(s); setAmount('') }}
              className={`px-5 py-2 rounded-lg text-xs font-black transition-all ${
                side === s 
                  ? 'bg-[var(--bg-secondary)] text-[var(--accent-primary)] shadow-sm border border-[var(--accent-primary)]/20' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>

        {!hideChart ? (
          <div style={{ marginBottom: 20 }}>
            <PriceChart mint={token.mint} price={token.price || 0} priceChange={token.priceChange24h || 0} />
          </div>
        ) : null}

      <div className="relative mb-3">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[10px] font-black text-[var(--text-muted)] tracking-widest">PAYING</span>
            {connected && publicKey ? (
              <span className="text-[10px] font-bold tabular-nums text-[var(--text-muted)]">
                Balance{' '}
                <span className="font-mono text-[var(--text-primary)]">
                  {side === 'buy'
                    ? solBalance == null
                      ? '…'
                      : fmtSol(solBalance)
                    : tokenWalletBalance == null
                      ? '…'
                      : `${fmtNum(tokenWalletBalance)} $${token.symbol}`}
                </span>
              </span>
            ) : null}
          </div>
          <div className="flex items-center bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-xl overflow-hidden focus-within:border-[var(--accent-primary)] transition-colors">
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.0"
              className="flex-1 p-3 bg-transparent border-none text-[var(--text-primary)] text-lg font-mono font-bold placeholder:text-[var(--text-muted)]/30"
            />
            <span className="px-4 text-[var(--text-primary)] text-xs font-mono font-black border-l border-[var(--border)] bg-[var(--bg-secondary)] h-full flex items-center">
              {side === 'buy' ? 'SOL' : `$${token.symbol}`}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {([25, 50, 75, 100] as const).map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => applyPayingPercent(pct)}
                disabled={!canUsePayingPercents || (pct === 100 && hundredPercentDisabled)}
                title={
                  pct === 100 && side === 'buy'
                    ? `Uses balance minus ~${SOL_MAX_SLACK} SOL for network fees`
                    : undefined
                }
                className="min-w-[2.75rem] rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] transition-colors hover:border-[var(--accent-primary)]/40 hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        <div className="relative z-10 -my-2 flex justify-center py-1">
          <button
            type="button"
            onClick={flipPayingReceiving}
            aria-label="Switch paying and receiving (toggle buy and sell)"
            title="Switch tokens"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm transition-all hover:border-[var(--accent-primary)]/50 hover:bg-[var(--bg-tertiary)] active:scale-95"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M7 16V4" />
              <path d="M3 8l4-4 4 4" />
              <path d="M17 8v12" />
              <path d="M21 16l-4 4-4-4" />
            </svg>
          </button>
        </div>

        {/* Output */}
        <div className="mb-4">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[10px] font-black text-[var(--text-muted)] tracking-widest">RECEIVING</span>
            {connected && publicKey ? (
              <span className="text-[10px] font-bold tabular-nums text-[var(--text-muted)]">
                Balance{' '}
                <span className="font-mono text-[var(--text-primary)]">
                  {side === 'buy'
                    ? tokenWalletBalance == null
                      ? '…'
                      : `${fmtNum(tokenWalletBalance)} $${token.symbol}`
                    : solBalance == null
                      ? '…'
                      : fmtSol(solBalance)}
                </span>
              </span>
            ) : null}
          </div>
          <div className="flex items-center bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-xl overflow-hidden">
            <div className="flex-1 p-3 text-[var(--text-primary)] text-lg font-mono font-bold opacity-80">
              {quoteLoading ? '…' : quote ? fmtNum(quote.outAmount) : '0'}
            </div>
            <span className="px-4 text-[var(--text-primary)] text-xs font-mono font-black border-l border-[var(--border)] bg-[var(--bg-secondary)] h-full flex items-center">
              {side === 'buy' ? `$${token.symbol}` : 'SOL'}
            </span>
          </div>
        </div>

        {/* Impact */}
        {quote && (
          <div className="flex justify-between mb-4 px-1">
            <span className={`text-[10px] font-bold tracking-tight ${priceImpact > 5 ? 'text-[var(--accent-red)]' : 'text-[var(--text-muted)]'}`}>
              Impact: <span className="font-mono">{priceImpact.toFixed(2)}%</span>
            </span>
            <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-tight">
              Fee:{' '}
              <span className="font-mono">{quote.fee != null ? `${fmtNum(quote.fee)} SOL` : '—'}</span>
            </span>
          </div>
        )}

        {/* Swap button */}
        <button
          type="button"
          disabled={primaryDisabled}
          onClick={handleSwap}
          style={{
            width: '100%', padding: '14px', borderRadius: 10,
            fontSize: 14, fontWeight: 800, cursor: primaryDisabled ? 'not-allowed' : 'pointer',
            opacity: primaryDisabled ? 0.65 : 1,
            transition: 'all 0.15s',
            ...getSwapButtonStyle(),
            border: 'none',
          }}
        >
          {txLoading ? 'Swapping…' : txStatus === 'success' ? '✓ Swap Complete!' : getSwapButtonText()}
        </button>

        {txStatus === 'success' && (
          <div style={{ marginTop: 10, textAlign: 'center', fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
            Transaction complete!
          </div>
        )}

        {txStatus === 'error' && (
          <div style={{ marginTop: 10, textAlign: 'center', fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
            {txError || 'Transaction failed.'}
          </div>
        )}
      </div>

      {showConfirm && (
        <ConfirmModal
          tokenName={token.name}
          wallet={token.creatorWallet || ''}
          onCancel={() => setShowConfirm(false)}
          onConfirm={doSwap}
        />
      )}
    </div>
  )
}
