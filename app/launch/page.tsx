'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthProvider'
import LaunchStepIndicator from '@/components/launch/LaunchStepIndicator'
import LaunchBuilderIdentityCard from '@/components/launch/LaunchBuilderIdentityCard'
import LaunchSuccessScreen from '@/components/launch/LaunchSuccessScreen'
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

  const handleDeploy = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          symbol,
          description,
          builderTwitter: 'nicocarvalho',
          walletAddress: 'Wallet123',
        }),
      })

      const data = await res.json()
      if (data.success) {
        setLaunchSnapshot(captureLaunchSnapshot(payload))
        setContractAddress(data.mint)
        setDeployed(true)
      } else {
        alert(data.error)
      }
    } catch (err) {
      console.error(err)
      alert('Failed to connect to Buildry backend.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111] font-sans">
      <header className="sticky top-0 z-50 flex h-16 items-center border-b border-gray-200 bg-white px-6">
        <Link href="/" className="text-lg font-black tracking-tight hover:opacity-80">
          Buildry
        </Link>
        <div className="mx-4 text-gray-300">/</div>
        <div className="font-semibold text-gray-900">Token Launch</div>
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
                      <p className="text-lg font-black text-gray-900">Review & deploy</p>
                      <p className="mt-1 text-sm text-gray-500">Confirm details before sending to Bags.</p>
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
                    <div className="flex flex-wrap justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="rounded-xl border border-gray-200 bg-white px-6 py-3.5 text-sm font-black uppercase tracking-widest text-gray-600 transition-colors hover:bg-gray-50"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => void handleDeploy()}
                        className="flex min-w-[12rem] items-center justify-center gap-2 rounded-xl bg-slate-800 py-4 text-lg font-black text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-slate-900 disabled:opacity-70"
                      >
                        {loading ? (
                          <>
                            <svg
                              className="-ml-1 h-5 w-5 animate-spin text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                            Deploying…
                          </>
                        ) : (
                          'Launch token'
                        )}
                      </button>
                    </div>
                    <p className="text-center text-xs font-semibold uppercase tracking-wider text-gray-400">
                      100% fees go to liquidity pool & backers (per Bags)
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
