'use client'
import { useState, useEffect } from 'react'
import { TrustData } from '@/lib/trust'

interface TrustScoreState {
  trust: TrustData | null
  loading: boolean
  error: string | null
}

export function useTrustScore(
  wallet: string | null | undefined, 
  creatorImage?: string | null
): TrustScoreState {
  const [state, setState] = useState<TrustScoreState>({
    trust: null,
    loading: false,
    error: null,
  })

  useEffect(() => {
    if (!wallet) return
    setState({ trust: null, loading: true, error: null })

    let url = `/api/trust/${wallet}`
    if (creatorImage) {
      url += `?avatar=${encodeURIComponent(creatorImage)}`
    }

    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setState({ trust: data, loading: false, error: null })
      })
      .catch(err => {
        // Fail safe: show ANONYMOUS on error
        setState({
          trust: {
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
          },
          loading: false,
          error: err.message,
        })
      })
  }, [wallet])

  return state
}
