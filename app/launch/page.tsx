'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { Connection, VersionedTransaction } from '@solana/web3.js'
import { useAuth } from '@/context/AuthProvider'
import { prepareLaunchTransaction } from '@/app/actions/bags'
import LaunchStepIndicator from '@/components/launch/LaunchStepIndicator'
import LaunchBuilderIdentityCard from '@/components/launch/LaunchBuilderIdentityCard'
import LaunchSuccessScreen from '@/components/launch/LaunchSuccessScreen'
import LaunchOwnershipPanel from '@/components/launch/LaunchOwnershipPanel'
import { captureLaunchSnapshot, type LaunchCelebrationSnapshot } from '@/lib/launchSnapshot'
import type { BuilderContributionsSnapshot } from '@/lib/builderContributions'

type Step = 1 | 2 | 3

type ProfilePayload = {
  profile: Record<string, unknown> | null
  socialShowcase?: {
    github?: {
      username: string
      avatarUrl: string
      oauthName?: string | null
    } | null
    farcaster?: { username?: string } | null
  } | null
  contributions?: BuilderContributionsSnapshot
}

function AttachedProfileLinks({ profile, socialShowcase }: { profile: Record<string, unknown> | null; socialShowcase: ProfilePayload['socialShowcase'] }) {
  const ghUser = typeof profile?.github_username === 'string' ? profile.github_username.trim() : ''
  const twitter = typeof profile?.twitter_handle === 'string' ? profile.twitter_handle.replace(/^@/, '').trim() : ''
  const website = typeof profile?.website === 'string' ? profile.website.trim() : ''
  const fc =
    socialShowcase?.farcaster?.username ||
    (typeof profile?.farcaster_handle === 'string' ? profile.farcaster_handle.replace(/^@/, '').trim() : '')

  const items: { label: string; href: string }[] = []
  if (ghUser) items.push({ label: 'GitHub', href: `https://github.com/${ghUser}` })
  if (twitter) items.push({ label: 'X', href: `https://x.com/${twitter}` })
  if (website) {
    const url = /^https?:\/\//i.test(website) ? website : `https://${website}`
    items.push({ label: 'Website', href: url })
  }
  if (fc) items.push({ label: 'Farcaster', href: `https://warpcast.com/${fc}` })

  if (!items.length) {
    return (
      <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-3 text-sm text-gray-500">
        No public links on your profile yet. Add GitHub, website, or Farcaster in{' '}
        <Link href="/settings" className="font-bold text-blue-600 hover:underline">
          Settings
        </Link>{' '}
        so they can travel with your token story.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((x) => (
        <a
          key={x.label}
          href={x.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm transition-colors hover:border-blue-200 hover:text-blue-700"
        >
          {x.label}
        </a>
      ))}
    </div>
  )
}

export default function LaunchStudio() {
  const { user } = useAuth()
  const { publicKey, sendTransaction, signTransaction } = useWallet()
  const [loading, setLoading] = useState(false)
  const [deployed, setDeployed] = useState(false)
  const [contractAddress, setContractAddress] = useState('')
  const [launchSnapshot, setLaunchSnapshot] = useState<LaunchCelebrationSnapshot | null>(null)

  const [step, setStep] = useState<Step>(1)
  const [maxReached, setMaxReached] = useState<Step>(1)

  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [description, setDescription] = useState('')

  const [payload, setPayload] = useState<ProfilePayload | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileRefreshing, setProfileRefreshing] = useState(false)

  const loadProfile = useCallback(async () => {
    if (!user?.id) {
      setPayload(null)
      setProfileLoading(false)
      return
    }
    setProfileLoading(true)
    try {
      const res = await fetch(`/api/profile/${encodeURIComponent(user.id)}`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setPayload({
          profile: data.profile ?? null,
          socialShowcase: data.socialShowcase ?? null,
          contributions: data.contributions,
        })
      } else {
        setPayload(null)
      }
    } catch {
      setPayload(null)
    } finally {
      setProfileLoading(false)
      setProfileRefreshing(false)
    }
  }, [user?.id])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  useEffect(() => {
    const onFocus = () => {
      if (user?.id) void loadProfile()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [loadProfile, user?.id])

  const refreshProfile = () => {
    setProfileRefreshing(true)
    void loadProfile()
  }

  const goStep = (s: Step) => {
    if (s <= maxReached) setStep(s)
  }

  const nextFrom1 = () => {
    if (!name.trim() || !symbol.trim()) return
    setStep(2)
    setMaxReached((m) => (m < 2 ? 2 : m))
  }

  const nextFrom2 = () => {
    if (!description.trim()) return
    setStep(3)
    setMaxReached(3)
  }

  const resolveTokenImageUrl = useCallback((): string => {
    if (user?.avatar_url) return user.avatar_url
    const ghAvatar = payload?.socialShowcase?.github?.avatarUrl
    if (ghAvatar) return ghAvatar
    const profileAvatar = payload?.profile && typeof (payload.profile as { avatar_url?: string }).avatar_url === 'string'
      ? (payload.profile as { avatar_url: string }).avatar_url
      : ''
    if (profileAvatar) return profileAvatar
    const ghLogin =
      typeof payload?.profile?.github_username === 'string'
        ? payload.profile.github_username.replace(/^@/, '').trim()
        : payload?.socialShowcase?.github?.username
    if (ghLogin) return `https://unavatar.io/github/${encodeURIComponent(ghLogin)}`
    const handle =
      (typeof payload?.profile?.username === 'string' && payload.profile.username) || user?.name || 'buildry'
    return `https://unavatar.io/github/${encodeURIComponent(String(handle).replace(/^@/, ''))}`
  }, [payload, user?.avatar_url, user?.name])

  const handleDeploy = async (ownership?: {
    ownershipUsd: number
    ownershipPct: number | null
    solanaWallet: string | null
  }) => {
    if (!publicKey) {
      alert('Connect your Solana wallet to launch on Bags (mainnet).')
      return
    }
    const walletOk =
      !ownership?.solanaWallet || ownership.solanaWallet.trim() === publicKey.toBase58()
    if (!walletOk) {
      alert('Connected wallet must match the address shown in the ownership panel.')
      return
    }
    if (!name.trim() || !symbol.trim() || !description.trim()) {
      alert('Complete token name, symbol, and story before launching.')
      return
    }

    setLoading(true)
    try {
      const prep = await prepareLaunchTransaction(
        name.trim(),
        symbol.trim().toUpperCase(),
        description.trim(),
        resolveTokenImageUrl(),
        publicKey.toBase58(),
        user?.id
      )

      if (!prep.success || !prep.transactionBase64 || !prep.tokenMint) {
        throw new Error(
          prep.error ||
            'Could not build launch transaction. Check BAGS_API_KEY on the server and try again.'
        )
      }

      const rpc =
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
      const connection = new Connection(rpc, 'confirmed')
      const vtx = VersionedTransaction.deserialize(Buffer.from(prep.transactionBase64, 'base64'))

      let signature: string
      if (sendTransaction) {
        signature = await sendTransaction(vtx, connection)
      } else if (signTransaction) {
        const signed = await signTransaction(vtx)
        signature = await connection.sendRawTransaction(signed.serialize())
      } else {
        throw new Error('Wallet cannot sign transactions.')
      }

      await connection.confirmTransaction(signature, 'confirmed')

      setLaunchSnapshot(captureLaunchSnapshot(payload))
      setContractAddress(prep.tokenMint)
      setDeployed(true)
    } catch (err: unknown) {
      console.error(err)
      const msg = err instanceof Error ? err.message : 'Launch failed.'
      alert(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111] font-sans">
      <header className="sticky top-0 z-50 flex h-16 flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-6">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Link href="/" className="text-lg font-black tracking-tight hover:opacity-80">
            Buildry
          </Link>
          <div className="text-gray-300">/</div>
          <div className="font-semibold text-gray-900">Token Launch</div>
        </div>
        <div className="wallet-adapter-button-trigger [&_.wallet-adapter-button]:rounded-xl [&_.wallet-adapter-button]:!bg-slate-900 [&_.wallet-adapter-button]:!text-[11px] [&_.wallet-adapter-button]:!font-black [&_.wallet-adapter-button]:!uppercase [&_.wallet-adapter-button]:!tracking-widest">
          <WalletMultiButton />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        {deployed && contractAddress ? (
          <LaunchSuccessScreen
            mint={contractAddress}
            tokenName={name}
            tokenSymbol={symbol}
            snapshot={launchSnapshot ?? captureLaunchSnapshot(payload)}
          />
        ) : (
          <div>
            <div className="mb-10 text-center">
              <h1 className="mb-4 text-4xl font-black tracking-tight">Launch your token</h1>
              <p className="mb-4 text-lg text-gray-500">
                Buildry is built around your token—not a generic project page. Deploy through the Bags API with your wallet and profile context so the right story travels with the asset.
              </p>
              <p className="mx-auto max-w-2xl text-base leading-relaxed text-gray-400">
                After launch, we’re focused on a dedicated token home for holders: liquidity signals, charts over time, and paths for new buyers on-chain and from Buildry to find and track your token.
              </p>
            </div>

            <LaunchStepIndicator current={step} maxReached={maxReached} onGoTo={goStep} />

            {!user && (
              <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-center text-sm text-amber-950">
                <span className="font-semibold">Sign in</span> to load your builder identity card (GitHub avatar, score, streak). You can still walk through the steps after logging in.
                <Link href="/" className="ml-2 font-bold text-amber-900 underline underline-offset-2 hover:no-underline">
                  Go home to sign in
                </Link>
              </div>
            )}

            <form
              className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-xl md:p-10"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-sky-100/40 blur-3xl" aria-hidden />
              <div className="pointer-events-none absolute -bottom-32 -left-20 h-56 w-56 rounded-full bg-violet-100/30 blur-3xl" aria-hidden />

              <div className="relative z-10 space-y-8">
                <LaunchBuilderIdentityCard
                  loading={profileLoading}
                  profile={payload?.profile ?? null}
                  socialShowcase={payload?.socialShowcase ?? null}
                  contributions={payload?.contributions}
                  fallbackName={user?.name ?? null}
                  fallbackAvatar={user?.avatar_url ?? null}
                  onRefresh={refreshProfile}
                  refreshing={profileRefreshing}
                />

                {step === 1 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div>
                      <h3 className="mb-1 text-xs font-black uppercase tracking-[0.2em] text-gray-400">Step 1</h3>
                      <p className="text-lg font-black text-gray-900">Token basics</p>
                      <p className="mt-1 text-sm text-gray-500">Name and ticker as they should appear to buyers.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-bold text-gray-700">Token name</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. NextGen"
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 text-lg font-medium text-gray-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-bold text-gray-700">Token symbol</label>
                        <input
                          type="text"
                          value={symbol}
                          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                          placeholder="e.g. NGP"
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 text-lg font-medium text-gray-900 uppercase outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={nextFrom1}
                        className="rounded-xl bg-slate-900 px-8 py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-black active:scale-[0.98]"
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div>
                      <h3 className="mb-1 text-xs font-black uppercase tracking-[0.2em] text-gray-400">Step 2</h3>
                      <p className="text-lg font-black text-gray-900">Your builder story + links</p>
                      <p className="mt-1 text-sm text-gray-500">
                        Tell holders what they’re backing. Profile links below are read from your Buildry profile and update when you refresh the card above.
                      </p>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-black uppercase tracking-wider text-gray-400">Attached links</p>
                      <AttachedProfileLinks profile={payload?.profile ?? null} socialShowcase={payload?.socialShowcase} />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-bold text-gray-700">Story for holders & buyers</label>
                      <textarea
                        rows={5}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What’s the token for, what’s shipping next, and why should holders and new buyers care?"
                        className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 font-medium text-gray-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                    <div className="flex flex-wrap justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="rounded-xl border border-gray-200 bg-white px-6 py-3.5 text-sm font-black uppercase tracking-widest text-gray-600 transition-colors hover:bg-gray-50"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={nextFrom2}
                        className="rounded-xl bg-slate-900 px-8 py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-black active:scale-[0.98]"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div>
                      <h3 className="mb-1 text-xs font-black uppercase tracking-[0.2em] text-gray-400">Step 3</h3>
                      <p className="text-lg font-black text-gray-900">Review &amp; deploy</p>
                      <p className="mt-1 text-sm text-gray-500">
                        Confirm details before sending to Bags. You must connect a Solana wallet and approve a transaction—there is
                        no &quot;demo mint&quot; in the current app.
                      </p>
                    </div>
                    <div className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50/80 p-6 text-left">
                      <div className="flex flex-wrap justify-between gap-2 border-b border-gray-200/80 pb-4">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Token</p>
                          <p className="text-xl font-black text-gray-900">{name || '—'}</p>
                          <p className="text-sm font-bold text-gray-500">${symbol || '—'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Builder</p>
                          <p className="font-bold text-gray-800">
                            {payload?.socialShowcase?.github?.oauthName ||
                              (typeof payload?.profile?.username === 'string' ? `@${payload.profile.username}` : null) ||
                              user?.name ||
                              '—'}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Story</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{description || '—'}</p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-black uppercase tracking-widest text-gray-600 transition-colors hover:bg-gray-50"
                      >
                        Back
                      </button>
                    </div>

                    <LaunchOwnershipPanel
                      loading={loading}
                      disabled={loading}
                      onLaunch={(detail) => void handleDeploy(detail)}
                    />

                    <p className="text-center text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Launch sends a real <strong className="font-bold text-gray-600">Solana mainnet</strong> transaction via Bags
                      (you pay network fees in SOL). The USD amount above is for your planning only until we wire creator pre-buy
                      lamports into the Bags launch tx. Fee split uses{' '}
                      <span className="font-mono text-[10px]">PLATFORM_TREASURY_WALLET</span> +{' '}
                      <span className="font-mono text-[10px]">PLATFORM_FEE_BPS</span> on the server.
                    </p>
                  </div>
                )}
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
