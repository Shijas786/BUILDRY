'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { Transaction } from '@solana/web3.js'
import { prepareClaimFeeTransactions } from '@/app/actions/bags'

export type ClaimFeesTokenOption = { mint: string; name: string; symbol: string }

type Props = {
  tokens: ClaimFeesTokenOption[]
  /** Wallet that should sign claims (profile primary Solana or on-chain creator). */
  profileSolWallet: string | null
  /** Omit “Launch a token” link when this card is already on `/launch`. */
  onLaunchPage?: boolean
  /** Mismatch copy: whose address `profileSolWallet` represents. */
  expectedFeeWallet?: 'profile' | 'creator'
  /** Omit the default “Claim fees” heading when the parent section already has a label. */
  hideTitle?: boolean
  /** Live accrued SOL for this mint (from Bags claimable API); shown on the claim button. */
  liveClaimableSol?: number | null
  liveClaimableLoading?: boolean
  onClaimComplete?: () => void
  className?: string
}

function shortAddr(s: string) {
  if (s.length <= 12) return s
  return `${s.slice(0, 4)}…${s.slice(-4)}`
}

export default function ClaimFeesCard({
  tokens,
  profileSolWallet,
  onLaunchPage,
  expectedFeeWallet = 'profile',
  hideTitle,
  liveClaimableSol,
  liveClaimableLoading,
  onClaimComplete,
  className = '',
}: Props) {
  const { connection } = useConnection()
  const { publicKey, signTransaction, sendTransaction } = useWallet()
  const { setVisible } = useWalletModal()
  const [selectedMint, setSelectedMint] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!tokens.length) return
    if (!selectedMint || !tokens.some((t) => t.mint === selectedMint)) {
      setSelectedMint(tokens[0].mint)
    }
  }, [tokens, selectedMint])

  const walletMismatch = useMemo(() => {
    if (!publicKey || !profileSolWallet) return false
    return publicKey.toBase58() !== profileSolWallet
  }, [publicKey, profileSolWallet])

  const handleClaim = async () => {
    setMessage(null)
    if (!publicKey) {
      setVisible(true)
      return
    }
    const tokenMint = selectedMint.trim()
    if (!tokenMint) {
      setMessage('Pick a token or enter a mint address.')
      return
    }

    setBusy(true)
    try {
      const res = await prepareClaimFeeTransactions(publicKey.toBase58(), tokenMint)
      if (!res.success) {
        throw new Error(res.error || 'Could not build claim transactions')
      }
      if (!res.transactionsBase64.length) {
        setMessage('Nothing to claim for this token right now.')
        return
      }

      const sigs: string[] = []
      for (const b64 of res.transactionsBase64) {
        const tx = Transaction.from(Buffer.from(b64, 'base64'))
        let signature: string
        if (sendTransaction) {
          signature = await sendTransaction(tx, connection)
        } else if (signTransaction) {
          const signed = await signTransaction(tx)
          signature = await connection.sendRawTransaction(signed.serialize())
        } else {
          throw new Error('Wallet does not support signing transactions.')
        }
        await connection.confirmTransaction(signature, 'confirmed')
        sigs.push(signature)
      }

      setMessage(`Claimed. ${sigs.length} transaction(s) confirmed. SOL is in your wallet.`)
      onClaimComplete?.()
    } catch (e: unknown) {
      const err = e as Error
      setMessage(err.message || 'Claim failed.')
    } finally {
      setBusy(false)
    }
  }

  const shell =
    `rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-sm ${onLaunchPage ? '' : 'mb-8'} ${className}`.trim()

  const showClaimableLine =
    liveClaimableLoading !== undefined || liveClaimableSol !== undefined

  const claimableLine = !showClaimableLine ? null : liveClaimableLoading ? (
    <span className="text-gray-400">Checking accrued fees…</span>
  ) : liveClaimableSol != null ? (
    <span className="text-gray-700">
      Available to claim:{' '}
      <span className="font-mono font-bold text-emerald-800">
        {liveClaimableSol.toFixed(4)} SOL
      </span>
    </span>
  ) : (
    <span className="text-gray-400">Fee balance unavailable</span>
  )

  if (tokens.length === 0) {
    return (
      <div className={shell}>
        {!hideTitle ? (
          <h2 className="text-lg font-black text-gray-900 tracking-tight">Claim fees</h2>
        ) : null}
        <p className={`text-xs text-gray-500 leading-relaxed ${hideTitle ? '' : 'mt-2'}`}>
          When you launch a Bags token, trading fees accrue to your fee share. Connect the wallet you
          used to launch, then claim SOL here.
        </p>
        <p className="text-sm text-gray-600 mt-4">
          {onLaunchPage
            ? 'Tokens tied to your verified Solana wallet will show up here once Bags lists them—launch below, then refresh this page if needed.'
            : 'No tokens linked to your profile wallet yet.'}
        </p>
        {!onLaunchPage ? (
          <Link
            href="/launch"
            className="inline-block mt-4 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all"
          >
            Launch a token
          </Link>
        ) : null}
      </div>
    )
  }

  return (
    <div className={shell}>
      {!hideTitle ? (
        <h2 className="text-lg font-black text-gray-900 tracking-tight">Claim fees</h2>
      ) : null}
      <p className={`text-xs text-gray-500 leading-relaxed ${hideTitle ? '' : 'mt-2'}`}>
        Connect the wallet that receives creator fees, then sign. Bags builds the claim transactions;
        SOL goes to your connected wallet.
      </p>

      {walletMismatch ? (
        <p className="text-xs text-amber-800 font-bold mt-3">
          Connected wallet ({publicKey ? shortAddr(publicKey.toBase58()) : ''}) differs from{' '}
          {expectedFeeWallet === 'creator'
            ? 'the creator wallet for this token'
            : 'your profile Solana wallet'}{' '}
          ({shortAddr(profileSolWallet!)}). Use the wallet that receives creator fees to claim.
        </p>
      ) : null}

      <div className="mt-4 flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1 flex flex-col gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Token
          </span>
          {tokens.length === 1 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
              <div className="text-sm font-bold text-gray-900">
                {tokens[0].symbol} — {tokens[0].name}
              </div>
              {showClaimableLine ? (
                <div className="mt-1.5 text-[11px] font-semibold text-gray-500">{claimableLine}</div>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <select
                value={selectedMint}
                onChange={(e) => setSelectedMint(e.target.value)}
                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-bold text-gray-900"
              >
                {tokens.map((t) => (
                  <option key={t.mint} value={t.mint}>
                    {t.symbol} — {t.name}
                  </option>
                ))}
              </select>
              {showClaimableLine ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2 text-[11px] font-semibold text-gray-500">
                  {claimableLine}
                </div>
              ) : null}
            </div>
          )}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleClaim()}
          className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50 shrink-0"
        >
          {busy
            ? 'Signing…'
            : liveClaimableLoading
              ? 'Claim fees'
              : liveClaimableSol != null && liveClaimableSol > 0
                ? `Claim ~${liveClaimableSol.toFixed(4)} SOL`
                : liveClaimableSol === 0
                  ? 'Claim fees (0 accrued)'
                  : 'Claim fees'}
        </button>
      </div>

      {!publicKey ? (
        <button
          type="button"
          onClick={() => setVisible(true)}
          className="mt-3 text-xs font-bold text-blue-600 hover:underline"
        >
          Connect wallet
        </button>
      ) : null}

      {message ? (
        <p className="text-xs font-bold text-gray-600 mt-3" role="status">
          {message}
        </p>
      ) : null}
    </div>
  )
}
