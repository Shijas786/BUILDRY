'use client'

import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef, useRef } from 'react'
import TokenCard from '@/components/TokenCard'
import { SkeletonTokenCard } from '@/components/SkeletonCard'
import { BagsToken } from '@/lib/bags'

type Tab = 'trending' | 'tokens' | 'portfolio'

export interface DiscoveryViewHandle {
  focusSearch: () => void
}

const DiscoveryView = forwardRef<DiscoveryViewHandle, {}>((_, ref) => {
  const [tab, setTab] = useState<Tab>('trending')
  const [search, setSearch] = useState('')
  const [tokens, setTokens] = useState<BagsToken[]>([])
  const [loading, setLoading] = useState(true)
  const [trustMap, setTrustMap] = useState<Record<string, any>>({})
  const [topBuildersOnly, setTopBuildersOnly] = useState(false)
  
  const searchInputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    focusSearch: () => {
      setTab('tokens')
      searchInputRef.current?.focus()
      searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }))

  const loadTrending = useCallback(async () => {
    setLoading(true)
    setTokens([])
    try {
      const res = await fetch('/api/tokens/trending')
      const data = await res.json()
      setTokens(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load trending:', err)
      setTokens([])
    } finally {
      setLoading(false)
    }
  }, [])

  const searchTokens = useCallback(async (query: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/tokens/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setTokens(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Search failed:', err)
      setTokens([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'trending') {
      loadTrending()
    } else if (tab === 'tokens' && search) {
      const timer = setTimeout(() => searchTokens(search), 300)
      return () => clearTimeout(timer)
    } else if (tab === 'tokens' && !search) {
      setTokens([])
    }
  }, [tab, search, loadTrending, searchTokens])

  useEffect(() => {
    tokens.forEach(token => {
      if (!token.creatorWallet || trustMap[token.mint]) return
      
      let url = `/api/trust/${token.creatorWallet}`
      const params = new URLSearchParams()
      if (token.twitter) params.append('twitter', token.twitter)
      if (token.creatorImage) params.append('avatar', token.creatorImage)
      
      const qs = params.toString()
      if (qs) url += `?${qs}`

      fetch(url)
        .then(r => r.json())
        .then(data => setTrustMap(prev => ({ ...prev, [token.mint]: data })))
        .catch(() => setTrustMap(prev => ({ ...prev, [token.mint]: { tier: 'ANONYMOUS' } })))
    })
  }, [tokens])

  const tabs: { id: Tab; label: string }[] = [
    { id: 'trending', label: 'Trending' },
    { id: 'tokens', label: 'Search' },
    { id: 'portfolio', label: 'Portfolio' },
  ]

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 80px' }}>
      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        border: '1.5px solid #e8e8e8', borderRadius: 10,
        padding: '0 14px', marginBottom: 20,
        background: '#fff', transition: 'border-color 0.15s',
      }}
        onFocus={e => (e.currentTarget.style.borderColor = '#0a0a0a')}
        onBlur={e => (e.currentTarget.style.borderColor = '#e8e8e8')}
      >
        <span style={{ color: '#bbb', fontSize: 16 }}>⌕</span>
        <input
          ref={searchInputRef}
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); if (tab !== 'tokens') setTab('tokens') }}
          placeholder="Search by name, symbol or mint address..."
          style={{
            flex: 1, padding: '12px 0', background: 'transparent',
            border: 'none', color: '#0a0a0a', fontSize: 14,
          }}
        />
        {search && (
          <button onClick={() => { setSearch(''); setTab('trending') }}
            style={{ color: '#bbb', fontSize: 16 }}>✕</button>
        )}
      </div>

      {/* Tabs & Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e8e8e8', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setSearch('') }}
              style={{
                padding: '12px 20px', background: 'none', border: 'none',
                fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
                color: tab === t.id ? '#0a0a0a' : '#aaa',
                borderBottom: tab === t.id ? '2px solid #0a0a0a' : '2px solid transparent',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        <button 
          onClick={() => setTopBuildersOnly(!topBuildersOnly)}
          style={{
            background: topBuildersOnly ? '#f0fdf4' : 'transparent',
            color: topBuildersOnly ? '#16a34a' : '#888',
            border: `1px solid ${topBuildersOnly ? '#bbf7d0' : 'transparent'}`,
            borderRadius: 30, padding: '6px 14px', fontSize: 12, fontWeight: 700, 
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all 0.2s',
          }}
        >
          {topBuildersOnly ? '● Top Builders Only' : '○ Verified Filter'}
        </button>
      </div>

      {/* Stats row */}
      {tab === 'trending' && !loading && tokens.length > 0 && (
        <div style={{
          display: 'flex', gap: 20, marginBottom: 16,
          padding: '10px 14px', background: '#f8f8f8',
          borderRadius: 8, fontSize: 12, color: '#888',
        }}>
          <span>
            <strong style={{ color: '#0a0a0a' }}>
              {Object.values(trustMap).filter((t: any) => t?.tier === 'VERIFIED').length}
            </strong> Verified
          </span>
          <span>
            <strong style={{ color: '#d97706' }}>
              {Object.values(trustMap).filter((t: any) => t?.tier === 'PARTIAL').length}
            </strong> Partial
          </span>
          <span>
            <strong style={{ color: '#dc2626' }}>
              {Object.values(trustMap).filter((t: any) => t?.tier === 'ANONYMOUS').length}
            </strong> Anonymous
          </span>
          <span style={{ marginLeft: 'auto' }}>{tokens.length} tokens found</span>
        </div>
      )}

      {/* Content */}
      <div className="fade-in">
        {tab === 'portfolio' ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#bbb' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>◎</div>
            <div style={{ fontSize: 14 }}>Connect your wallet to see your portfolio.</div>
          </div>
        ) : loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: 6 }, (_, i) => <SkeletonTokenCard key={i} />)}
          </div>
        ) : tokens.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#bbb' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 14 }}>
              {search ? 'No tokens found.' : 'No tokens available.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tokens
              .filter(token => !topBuildersOnly || trustMap[token.mint]?.tier === 'VERIFIED')
              .map(token => (
                <TokenCard 
                    key={token.mint} 
                    token={token} 
                    trustTier={trustMap[token.mint]?.tier} 
                    avatar={trustMap[token.mint]?.profilePicture}
                />
              ))}
          </div>
        )}
      </div>
    </main>
  )
})

DiscoveryView.displayName = 'DiscoveryView'
export default DiscoveryView
