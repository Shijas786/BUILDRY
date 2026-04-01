'use client'
import { useState, useEffect } from 'react'
import { TrustData } from '@/lib/trust'

interface TrustScoreState {
  trust: TrustData | null
  loading: boolean
  error: string | null
}

function anonymousTrust(creatorImage?: string | null): TrustData {
  return {
    tier: 'ANONYMOUS',
    profile: null,
    builderScore: null,
    builderRank: null,
    percentile: null,
    accounts: [],
    socials: [],
    twitterFromBags: null,
    githubCommits: null,
    heliusTransactions: null,
    hasGithub: false,
    hasTwitter: false,
    hasFarcaster: false,
    hasWallet: false,
    farcaster: null,
    previousBagsProjects: [],
    reliabilityScore: null,
    profilePicture: creatorImage || null,
  }
}

function trustApiUrl(wallet: string, creatorImage?: string | null, twitterFromBags?: string | null) {
  const base = `/api/trust/${encodeURIComponent(wallet.trim())}`
  const p = new URLSearchParams()
  if (creatorImage?.trim()) p.set('avatar', creatorImage.trim())
  if (twitterFromBags?.trim()) p.set('twitter', twitterFromBags.trim().replace(/^@/, ''))
  const q = p.toString()
  return q ? `${base}?${q}` : base
}

export function useTrustScore(
  wallet: string | null | undefined,
  creatorImage?: string | null,
  twitterFromBags?: string | null,
  /** When set (e.g. token linked in `user_token_launches`), trust card loads by Buildry uid — no wallet match required. */
  buildryLauncherUid?: string | null
): TrustScoreState {
  const [state, setState] = useState<TrustScoreState>(() => {
    if (buildryLauncherUid?.trim()) {
      return { trust: null, loading: true, error: null }
    }
    return !wallet?.trim()
      ? { trust: anonymousTrust(creatorImage), loading: false, error: null }
      : { trust: null, loading: true, error: null }
  })

  useEffect(() => {
    const uid = buildryLauncherUid?.trim()
    if (uid) {
      setState({ trust: null, loading: true, error: null })
      const p = new URLSearchParams()
      if (creatorImage?.trim()) p.set('avatar', creatorImage.trim())
      if (twitterFromBags?.trim()) p.set('twitter', twitterFromBags.trim().replace(/^@/, ''))
      const q = p.toString()
      const url = q ? `/api/trust/buildry/${encodeURIComponent(uid)}?${q}` : `/api/trust/buildry/${encodeURIComponent(uid)}`
      fetch(url, { cache: 'no-store' })
        .then((r) => r.json())
        .then((data) => {
          if (data.error) throw new Error(data.error)
          setState({ trust: data, loading: false, error: null })
        })
        .catch((err) => {
          setState({
            trust: anonymousTrust(creatorImage),
            loading: false,
            error: err.message,
          })
        })
      return
    }

    if (!wallet?.trim()) {
      setState({ trust: anonymousTrust(creatorImage), loading: false, error: null })
      return
    }

    setState({ trust: null, loading: true, error: null })

    const url = trustApiUrl(wallet, creatorImage, twitterFromBags)

    fetch(url, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setState({ trust: data, loading: false, error: null })
      })
      .catch((err) => {
        setState({
          trust: anonymousTrust(creatorImage),
          loading: false,
          error: err.message,
        })
      })
  }, [wallet, creatorImage, twitterFromBags, buildryLauncherUid])

  return state
}
