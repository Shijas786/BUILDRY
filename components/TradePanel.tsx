'use client'

import React, { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { BagsToken } from '@/lib/bags'
import { TrustData } from '@/lib/trust'
import { useTradeQuote } from '@/hooks/useTradeQuote'
import { fmtNum } from '@/lib/format'
import ConfirmModal from './ConfirmModal'
import PriceChart from './PriceChart'

import { VersionedTransaction, Connection } from '@solana/web3.js'

const SOL_MINT = 'So11111111111111111111111111111111111111112'
const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  process.env.SOLANA_RPC_URL ||
  'https://api.mainnet-beta.solana.com'

interface TradePanelProps {
  token: BagsToken
  trust: TrustData | null
  trustLoading: boolean
}

export default function TradePanel({ token, trust, trustLoading }: TradePanelProps) {
  const { connected, publicKey, sendTransaction } = useWallet()
  const { setVisible } = useWalletModal()
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

  const tier = trust?.tier
  const tier_ready = !trustLoading && !!trust
  const canSwap = connected && !quoteLoading && !!quote && tier_ready && amountNum > 0
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
    if (tier === 'PARTIAL') return 'Swap (Unverified Creator)'
    if (tier === 'ANONYMOUS') return '⚠ Swap (High Risk)'
    return 'SWAP'
  }

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

      // 2. Deserialize transaction
      const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64')
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf)

      // 3. Sign and Send
      const connection = new Connection(RPC_URL)
      const signature = await sendTransaction(transaction, connection)

      // 4. Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed')
      
      setTxStatus('success')
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

        <div style={{ marginBottom: 20 }}>
          <PriceChart 
            mint={token.mint} 
            price={token.price || 0} 
            priceChange={token.priceChange24h || 0} 
          />
        </div>

      <div className="relative mb-3">
          <div className="flex justify-between mb-1.5">
            <span className="text-[10px] font-black text-[var(--text-muted)] tracking-widest">PAYING</span>
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
        </div>

        <div className="text-center text-[var(--border-accent)] text-lg my-2">↓</div>

        {/* Output */}
        <div className="mb-4">
          <div className="flex justify-between mb-1.5">
            <span className="text-[10px] font-black text-[var(--text-muted)] tracking-widest">RECEIVING</span>
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

        {/* Smart Suggestion */}
        {tier_ready && side === 'buy' && (
          <div className={`rounded-xl p-4 mb-4 border ${
            tier === 'VERIFIED' ? 'bg-[var(--accent-green)]/10 border-[var(--accent-green)]/20' : 
            tier === 'PARTIAL' ? 'bg-[var(--accent-amber)]/10 border-[var(--accent-amber)]/20' : 
            'bg-[var(--accent-red)]/10 border-[var(--accent-red)]/20'
          }`}>
            <div className={`text-[10px] font-black uppercase tracking-widest mb-1 shadow-sm ${
              tier === 'VERIFIED' ? 'text-[var(--accent-green)]' : 
              tier === 'PARTIAL' ? 'text-[var(--accent-amber)]' : 
              'text-[var(--accent-red)]'
            }`}>
              Onchain Risk Brief
            </div>
            <div className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">
              {tier === 'VERIFIED' ? (
                <span>High confidence creator. Standard position sizes are appropriate.</span>
              ) : tier === 'PARTIAL' ? (
                <span>Partial identity detected. Recommended limit: <strong className="text-[var(--text-primary)]">5-10 SOL</strong>.</span>
              ) : (
                <span>Anonymous creator. High risk. Recommended limit: <strong className="text-[var(--text-primary)]">Under 1 SOL</strong>.</span>
              )}
            </div>
          </div>
        )}

        {/* Impact */}
        {quote && (
          <div className="flex justify-between mb-4 px-1">
            <span className={`text-[10px] font-bold tracking-tight ${priceImpact > 5 ? 'text-[var(--accent-red)]' : 'text-[var(--text-muted)]'}`}>
              Impact: <span className="font-mono">{priceImpact.toFixed(2)}%</span>
            </span>
            {quote.fee && (
              <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-tight">
                Fee: <span className="font-mono">{fmtNum(quote.fee)} SOL</span>
              </span>
            )}
          </div>
        )}

        {/* Swap button */}
        <button
          disabled={!canSwap || txLoading}
          onClick={handleSwap}
          style={{
            width: '100%', padding: '14px', borderRadius: 10,
            fontSize: 14, fontWeight: 800, cursor: canSwap ? 'pointer' : 'not-allowed',
            opacity: (canSwap && !txLoading) ? 1 : 0.5,
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
