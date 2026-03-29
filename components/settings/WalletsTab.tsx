'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { useWallet } from '@solana/wallet-adapter-react'
import {
  useAppKit,
  useAppKitAccount,
  useAppKitConnections,
  useAppKitProvider,
} from '@reown/appkit/react'
import { firebaseAuth } from '@/lib/firebaseClient'
import { uint8ArrayToBase64 } from '@/lib/walletClientEncode'
import { MAX_VERIFIED_WALLETS } from '@/lib/walletConstants'

/** Reown Solana adapter exposes signing on the injected / WalletConnect provider. */
type ReownSolWalletProvider = {
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>
}

export type VerifiedWalletRow = { chain: 'sol' | 'evm'; address: string; verified_at?: number }

function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  if (/user rejected|denied|cancel|rejected the request/i.test(msg)) {
    return 'The request was cancelled in your wallet.'
  }
  if (/already linked|another account|409/i.test(msg)) {
    return msg
  }
  return msg || 'Something went wrong. Please try again.'
}

function truncateMiddle(s: string, lead = 6, tail = 4): string {
  const t = String(s).trim()
  if (t.length <= lead + tail + 2) return t
  return `${t.slice(0, lead)} … ${t.slice(-tail)}`
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className || 'h-4 w-4'}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

function IconEth({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path fill="#627EEA" d="M16 4l9.8 15.2L16 14.4 6.2 19.2 16 4z" />
      <path fill="#C0CBF0" d="M16 14.4l9.8 4.8L16 28l-9.8-8.8 9.8-4.8z" />
    </svg>
  )
}

function IconSol({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id="solg" x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9945FF" />
          <stop offset="1" stopColor="#14F195" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#solg)" />
      <path
        fill="white"
        fillOpacity="0.95"
        d="M10.2 20.1l2.4-2.4h11.1l-2.4 2.4H10.2zm0-4.8l2.4-2.4h11.1l-2.4 2.4H10.2zm4.8-4.8l2.4-2.4h6.3l-2.4 2.4h-6.3z"
      />
    </svg>
  )
}

function StatusBanner({
  kind,
  text,
  onDismiss,
}: {
  kind: 'success' | 'error'
  text: string
  onDismiss: () => void
}) {
  const isOk = kind === 'success'
  return (
    <div
      role="status"
      aria-live="polite"
      className={`mb-6 flex gap-3 rounded-xl border px-4 py-3 ${
        isOk ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900'
      }`}
    >
      <p className="flex-1 text-sm font-medium leading-relaxed">{text}</p>
      <button
        type="button"
        onClick={onDismiss}
        className={`shrink-0 rounded-lg px-2 text-sm font-semibold ${
          isOk ? 'text-emerald-800 hover:bg-emerald-100' : 'text-red-800 hover:bg-red-100'
        }`}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}

export default function SettingsWalletsTab({
  profile,
  setProfile,
  userId,
}: {
  profile: {
    verified_wallets?: VerifiedWalletRow[]
    sol_wallet?: string
    evm_wallet?: string
  }
  setProfile: React.Dispatch<React.SetStateAction<any>>
  userId?: string
}) {
  const { open } = useAppKit()
  const { address: wagmiAddress, isConnected } = useAccount()
  const { signMessageAsync, isPending: evmSigning } = useSignMessage()
  const { publicKey, signMessage, connected: adapterSolConnected, wallet: solWallet } = useWallet()

  const { address: reownSolAddress, isConnected: reownSolConnected } = useAppKitAccount({ namespace: 'solana' })
  const { walletProvider: reownSolProvider } = useAppKitProvider<ReownSolWalletProvider>('solana')
  const { connections: reownSolConnections } = useAppKitConnections('solana')
  const reownSolWalletName = reownSolConnections[0]?.name

  const adapterSolAddr = publicKey?.toBase58() ?? ''
  /** Reown modal connects here; @solana/wallet-adapter-react is only used if user picks Phantom via adapter UI. */
  const solActiveAddress =
    reownSolConnected && reownSolAddress
      ? reownSolAddress
      : adapterSolConnected && adapterSolAddr
        ? adapterSolAddr
        : ''
  const solActiveConnected = Boolean(solActiveAddress)

  const [busy, setBusy] = useState<'evm' | 'sol' | null>(null)
  const [rowBusy, setRowBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  /** User must click Connect before we show verify + adapter status (avoids injected Phantom looking “linked” when list is empty). */
  const [evmFlowStarted, setEvmFlowStarted] = useState(false)
  const [solFlowStarted, setSolFlowStarted] = useState(false)

  useEffect(() => {
    if (!isConnected || !wagmiAddress) setEvmFlowStarted(false)
  }, [isConnected, wagmiAddress])

  useEffect(() => {
    if (!solActiveConnected || !solActiveAddress) setSolFlowStarted(false)
  }, [solActiveConnected, solActiveAddress])

  const list: VerifiedWalletRow[] = Array.isArray(profile.verified_wallets) ? profile.verified_wallets : []
  const primaryEvm = profile.evm_wallet || list.find((w) => w.chain === 'evm')?.address
  const primarySol = profile.sol_wallet || list.find((w) => w.chain === 'sol')?.address

  const getToken = useCallback(async () => {
    if (!firebaseAuth?.currentUser) return null
    return firebaseAuth.currentUser.getIdToken()
  }, [])

  const applyWalletList = useCallback(
    (vw: VerifiedWalletRow[]) => {
      setProfile((p: any) => ({
        ...p,
        verified_wallets: vw,
        sol_wallet: vw.find((w: VerifiedWalletRow) => w.chain === 'sol')?.address ?? null,
        evm_wallet: vw.find((w: VerifiedWalletRow) => w.chain === 'evm')?.address ?? null,
      }))
    },
    [setProfile]
  )

  const runVerify = useCallback(
    async (challengeId: string, signature: string) => {
      const idToken = await getToken()
      if (!idToken) throw new Error('You are not signed in.')
      const res = await fetch('/api/profile/wallet/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ challengeId, signature }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Verification failed.')
      return data as { verified_wallets?: VerifiedWalletRow[] }
    },
    [getToken]
  )

  const postWalletAction = useCallback(
    async (path: 'primary' | 'remove', chain: 'sol' | 'evm', address: string) => {
      const idToken = await getToken()
      if (!idToken) throw new Error('You are not signed in.')
      const res = await fetch(`/api/profile/wallet/${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ chain, address }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Request failed.')
      return data as { verified_wallets?: VerifiedWalletRow[] }
    },
    [getToken]
  )

  const linkEvm = async () => {
    setMsg(null)
    if (!userId) {
      setMsg({ kind: 'error', text: 'Sign in to link a wallet.' })
      return
    }
    if (!isConnected || !wagmiAddress) {
      setMsg({
        kind: 'error',
        text: 'Connect an EVM wallet with the button below, then tap “Sign to verify”.',
      })
      return
    }
    setBusy('evm')
    try {
      const idToken = await getToken()
      if (!idToken) {
        setMsg({ kind: 'error', text: 'Your session expired. Please sign in again.' })
        return
      }
      const chRes = await fetch('/api/profile/wallet/challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ chain: 'evm', address: wagmiAddress }),
      })
      const ch = await chRes.json().catch(() => ({}))
      if (!chRes.ok) {
        setMsg({ kind: 'error', text: typeof ch.error === 'string' ? ch.error : 'Could not start verification.' })
        return
      }
      const sig = await signMessageAsync({
        message: ch.message as string,
        account: wagmiAddress as `0x${string}`,
      })
      const done = await runVerify(ch.challengeId as string, sig)
      const vw = Array.isArray(done.verified_wallets) ? done.verified_wallets : []
      applyWalletList(vw)
      setMsg({ kind: 'success', text: 'EVM wallet verified and added to your profile.' })
    } catch (e: unknown) {
      setMsg({ kind: 'error', text: friendlyError(e) })
    } finally {
      setBusy(null)
    }
  }

  const linkSol = async () => {
    setMsg(null)
    if (!userId) {
      setMsg({ kind: 'error', text: 'Sign in to link a wallet.' })
      return
    }
    if (!solActiveConnected || !solActiveAddress) {
      void open({ view: 'Connect', namespace: 'solana' })
      setMsg({
        kind: 'error',
        text: 'Connect a Solana wallet in Reown (button above), approve, then tap “Sign to verify”.',
      })
      return
    }
    const addr = solActiveAddress
    setBusy('sol')
    try {
      const idToken = await getToken()
      if (!idToken) {
        setMsg({ kind: 'error', text: 'Your session expired. Please sign in again.' })
        return
      }
      const chRes = await fetch('/api/profile/wallet/challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ chain: 'sol', address: addr }),
      })
      const ch = await chRes.json().catch(() => ({}))
      if (!chRes.ok) {
        setMsg({ kind: 'error', text: typeof ch.error === 'string' ? ch.error : 'Could not start verification.' })
        return
      }
      const encoded = new TextEncoder().encode(ch.message as string)
      let sigBytes: Uint8Array
      if (
        reownSolConnected &&
        reownSolAddress === addr &&
        typeof reownSolProvider?.signMessage === 'function'
      ) {
        sigBytes = await reownSolProvider.signMessage(encoded)
      } else if (adapterSolConnected && publicKey?.toBase58() === addr && signMessage) {
        sigBytes = await signMessage(encoded)
      } else {
        setMsg({
          kind: 'error',
          text: 'This wallet does not support message signing here. Reconnect via “Connect Solana wallet” or try Phantom.',
        })
        return
      }
      const sigB64 = uint8ArrayToBase64(sigBytes)
      const done = await runVerify(ch.challengeId as string, sigB64)
      const vw = Array.isArray(done.verified_wallets) ? done.verified_wallets : []
      applyWalletList(vw)
      setMsg({ kind: 'success', text: 'Solana wallet verified and added to your profile.' })
    } catch (e: unknown) {
      setMsg({ kind: 'error', text: friendlyError(e) })
    } finally {
      setBusy(null)
    }
  }

  const setPrimary = async (chain: 'sol' | 'evm', address: string) => {
    const key = `p-${chain}-${address}`
    setRowBusy(key)
    setMsg(null)
    try {
      const data = await postWalletAction('primary', chain, address)
      const vw = Array.isArray(data.verified_wallets) ? data.verified_wallets : []
      applyWalletList(vw)
      setMsg({ kind: 'success', text: 'Primary wallet updated.' })
    } catch (e: unknown) {
      setMsg({ kind: 'error', text: friendlyError(e) })
    } finally {
      setRowBusy(null)
    }
  }

  const removeWallet = async (chain: 'sol' | 'evm', address: string) => {
    const key = `r-${chain}-${address}`
    setRowBusy(key)
    setMsg(null)
    try {
      const data = await postWalletAction('remove', chain, address)
      const vw = Array.isArray(data.verified_wallets) ? data.verified_wallets : []
      applyWalletList(vw)
      setMsg({ kind: 'success', text: 'Wallet removed from your profile.' })
    } catch (e: unknown) {
      setMsg({ kind: 'error', text: friendlyError(e) })
    } finally {
      setRowBusy(null)
    }
  }

  const signing = busy !== null || evmSigning
  const isPrimary = (w: VerifiedWalletRow) =>
    w.chain === 'evm' ? w.address === primaryEvm : w.address === primarySol

  const evmConnectedLower = wagmiAddress?.toLowerCase() ?? ''
  const evmAlreadyInProfile =
    !!evmConnectedLower &&
    list.some((w) => w.chain === 'evm' && w.address.toLowerCase() === evmConnectedLower)

  const solAlreadyInProfile =
    !!solActiveAddress && list.some((w) => w.chain === 'sol' && w.address === solActiveAddress)

  const showEvmVerify = evmFlowStarted && isConnected && !!wagmiAddress && !evmAlreadyInProfile
  const showSolVerify = solFlowStarted && solActiveConnected && !!solActiveAddress && !solAlreadyInProfile

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
      <header className="mb-8">
        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">Verified addresses</h2>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed max-w-2xl">
          You can manually connect up to {MAX_VERIFIED_WALLETS} wallets. Wallet addresses are public on your profile
          after you sign to verify ownership. Use Reown (WalletConnect) to connect, then sign once per address.
        </p>
      </header>

      {msg && <StatusBanner kind={msg.kind} text={msg.text} onDismiss={() => setMsg(null)} />}

      <section className="mb-8" aria-labelledby="wallet-list-heading">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span id="wallet-list-heading" className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            Linked wallets
          </span>
          <span className="text-xs font-medium tabular-nums text-slate-400">
            {list.length}/{MAX_VERIFIED_WALLETS}
          </span>
        </div>

        {list.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-5 py-12 text-center">
            <p className="text-sm font-semibold text-slate-700">No wallets linked yet</p>
            <p className="mt-1.5 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Use “Connect EVM wallet” or “Connect Solana wallet” below. After your wallet is connected, “Sign to verify”
              will appear so you can add an address to this list.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {list.map((w, i) => {
              const primary = isPrimary(w)
              const rowKey = `${w.chain}-${w.address}-${i}`
              const busyP = rowBusy === `p-${w.chain}-${w.address}`
              const busyR = rowBusy === `r-${w.chain}-${w.address}`
              return (
                <li
                  key={rowKey}
                  className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-[0_1px_0_rgba(15,23,42,0.04)]"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="mt-0.5 shrink-0 w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden">
                      {w.chain === 'evm' ? (
                        <IconEth className="w-7 h-7" />
                      ) : (
                        <IconSol className="w-7 h-7 rounded-md" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-sm font-semibold text-slate-900 tracking-tight" title={w.address}>
                          {truncateMiddle(w.address)}
                        </p>
                        {w.chain === 'evm' ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                            <span className="w-1.5 h-1.5 rounded-sm bg-blue-500" aria-hidden />
                            EVM
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 border border-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
                            <span className="w-1.5 h-1.5 rounded-sm bg-gradient-to-br from-violet-500 to-emerald-400" aria-hidden />
                            Solana
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Verified via Reown · Buildry</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 sm:pl-2">
                    {primary ? (
                      <span className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                        Primary
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={!!rowBusy}
                        onClick={() => void setPrimary(w.chain, w.address)}
                        className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs font-bold hover:bg-slate-50 disabled:opacity-50 transition-colors"
                      >
                        {busyP ? <Spinner className="h-4 w-4" /> : 'Set as primary'}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!!rowBusy}
                      onClick={() => void removeWallet(w.chain, w.address)}
                      className="h-9 px-3 rounded-lg border border-red-200 bg-white text-red-600 text-xs font-bold hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      {busyR ? <Spinner className="h-4 w-4 text-red-500" /> : 'Disable'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="space-y-4" aria-label="Connect wallets">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Add wallet</span>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {showEvmVerify ? (
              <div
                role="button"
                tabIndex={0}
                title="Tap to use a different EVM wallet"
                onClick={() => void open({ view: 'Connect', namespace: 'eip155' })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    void open({ view: 'Connect', namespace: 'eip155' })
                  }
                }}
                className="flex min-h-[4.5rem] cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.04)] transition-colors hover:border-slate-300 hover:bg-white"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-white">
                  <IconEth className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">EVM · Connected</p>
                  <p className="truncate font-mono text-xs font-semibold text-slate-900" title={wagmiAddress}>
                    {truncateMiddle(wagmiAddress!, 8, 6)}
                  </p>
                  <p className="mt-0.5 text-[10px] font-medium text-slate-400">Tap row to switch wallet</p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEvmFlowStarted(true)
                  void open({ view: 'Connect', namespace: 'eip155' })
                }}
                className="flex min-h-[4.5rem] w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-left text-slate-900 shadow-[0_1px_0_rgba(15,23,42,0.04)] transition-colors hover:border-slate-300 hover:bg-white"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-white">
                  <IconEth className="h-7 w-7" />
                </div>
                <span className="text-sm font-bold">Connect EVM wallet</span>
              </button>
            )}
            {showEvmVerify ? (
              <button
                type="button"
                onClick={() => void linkEvm()}
                disabled={signing}
                className="h-11 w-full rounded-xl bg-slate-900 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-black disabled:opacity-45 inline-flex items-center justify-center gap-2"
              >
                {(busy === 'evm' || evmSigning) && <Spinner className="h-4 w-4 text-white" />}
                Sign to verify · EVM
              </button>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            {showSolVerify ? (
              <div
                role="button"
                tabIndex={0}
                title="Tap to use a different Solana wallet"
                onClick={() => void open({ view: 'Connect', namespace: 'solana' })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    void open({ view: 'Connect', namespace: 'solana' })
                  }
                }}
                className="flex min-h-[4.5rem] cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.04)] transition-colors hover:border-slate-300 hover:bg-white"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-white">
                  <IconSol className="h-7 w-7 rounded-md" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Solana · {reownSolWalletName || solWallet?.adapter?.name || 'Connected'}
                  </p>
                  <p className="truncate font-mono text-xs font-semibold text-slate-900" title={solActiveAddress}>
                    {truncateMiddle(solActiveAddress, 6, 4)}
                  </p>
                  <p className="mt-0.5 text-[10px] font-medium text-slate-400">Tap row to switch wallet</p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSolFlowStarted(true)
                  void open({ view: 'Connect', namespace: 'solana' })
                }}
                className="flex min-h-[4.5rem] w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-left text-slate-900 shadow-[0_1px_0_rgba(15,23,42,0.04)] transition-colors hover:border-slate-300 hover:bg-white"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-white">
                  <IconSol className="h-7 w-7 rounded-md" />
                </div>
                <span className="text-sm font-bold">Connect Solana wallet</span>
              </button>
            )}
            {showSolVerify ? (
              <button
                type="button"
                onClick={() => void linkSol()}
                disabled={signing}
                className="h-11 w-full rounded-xl bg-slate-900 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-black disabled:opacity-45 inline-flex items-center justify-center gap-2"
              >
                {busy === 'sol' && <Spinner className="h-4 w-4 text-white" />}
                Sign to verify · Solana
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <p className="mt-8 text-[11px] text-slate-400 leading-relaxed border-t border-slate-100 pt-6">
        Signatures only prove you control the address; they do not move funds. Challenges expire after ten minutes.
      </p>
    </div>
  )
}
