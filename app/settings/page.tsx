'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthProvider'
import { firebaseAuth, firebaseDb, isFirebaseConfigured } from '@/lib/firebaseClient'
import { FS } from '@/lib/firestoreCollections'
import { onAuthStateChanged } from 'firebase/auth'
import { addDoc, collection, deleteField, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore'
import FarcasterConnect from '@/components/FarcasterConnect'
import SettingsWalletsTab from '@/components/settings/WalletsTab'
import TelegramConnect from '@/components/TelegramConnect'

type SettingsTab = 'basics' | 'socials' | 'skills' | 'projects' | 'availability' | 'wallets'

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'basics', label: 'Public page' },
  { id: 'socials', label: 'Socials' },
  { id: 'skills', label: 'Skills & stack' },
  { id: 'projects', label: 'Projects' },
  { id: 'availability', label: 'Availability' },
  { id: 'wallets', label: 'Wallets' },
]

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

const USERNAME_REGEX = /^[a-z0-9_]{3,24}$/

function normalizeUsername(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9_]/g, '').slice(0, 24)
}

export default function SettingsPage() {
  const { user, refreshUser } = useAuth()
  const [activeTab, setActiveTab] = useState<SettingsTab>('basics')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')
  const [usernameMsg, setUsernameMsg] = useState('')
  const [initialUsername, setInitialUsername] = useState('')
  const [profile, setProfile] = useState({
    username: '',
    name: '',
    bio: '',
    tagline: '',
    location: '',
    website: '',
    avatar_url: '',
    banner_url: '',
    github_username: '',
    github_verified: false,
    twitter_handle: '',
    farcaster_handle: '',
    farcaster_fid: null as number | null,
    linkedin_url: '',
    linkedin_data: null as Record<string, unknown> | null,
    github_data: null as Record<string, unknown> | null,
    farcaster_data: null as Record<string, unknown> | null,
    telegram_handle: '',
    skills: [] as string[],
    open_for_work: false,
    hourly_rate_usd: '',
    availability: 'full_time',
    sol_wallet: '',
    evm_wallet: '',
    verified_wallets: [] as { chain: 'sol' | 'evm'; address: string; verified_at?: number }[],
  })
  const [projects, setProjects] = useState<any[]>([])
  const [showAddProject, setShowAddProject] = useState(false)
  const completionScore = [
    profile.username,
    profile.bio,
    profile.tagline,
    profile.location,
    profile.github_username || profile.twitter_handle || profile.farcaster_handle,
    profile.skills.length > 0 ? 'yes' : '',
  ].filter(Boolean).length

  useEffect(() => {
    if (!isFirebaseConfigured || !firebaseDb || !user?.id) return
    const db = firebaseDb

    const loadData = async () => {
      const profileSnap = await getDoc(doc(db, FS.BUILDER_PROFILES, user.id))
      if (profileSnap.exists()) {
        const data = profileSnap.data() as any
        const normalized = normalizeUsername(data.username || '')
        setProfile((p) => ({
          ...p,
          username: normalized,
          name: user.name || data.username || '',
          bio: data.bio || '',
          tagline: data.tagline || '',
          location: data.location || '',
          website: data.website || '',
          avatar_url: data.avatar_url || '',
          banner_url: data.banner_url || '',
          github_username: data.github_username || '',
          github_verified: Boolean(data.github_verified),
          twitter_handle: data.twitter_handle || '',
          farcaster_handle: data.farcaster_handle || '',
          farcaster_fid: typeof data.farcaster_fid === 'number' ? data.farcaster_fid : null,
          linkedin_url: data.linkedin_url || '',
          linkedin_data: data.linkedin_data || null,
          github_data: data.github_data || null,
          farcaster_data: data.farcaster_data || null,
          telegram_handle: data.telegram_handle || '',
          skills: data.skills || [],
          open_for_work: data.open_for_work || false,
          hourly_rate_usd: data.hourly_rate_usd?.toString() || '',
          availability: data.availability || 'full_time',
          sol_wallet: data.sol_wallet || '',
          evm_wallet: data.evm_wallet || '',
          verified_wallets: Array.isArray(data.verified_wallets) ? data.verified_wallets : [],
        }))
        setInitialUsername(normalized)
      }

      const projectsSnap = await getDocs(query(collection(db, FS.PROJECTS), where('builder_id', '==', user.id)))
      const docs = projectsSnap.docs
        .map((projectDoc) => ({ id: projectDoc.id, ...projectDoc.data() }))
        .sort((a: any, b: any) => {
          const aTime = typeof a.created_at === 'number' ? a.created_at : 0
          const bTime = typeof b.created_at === 'number' ? b.created_at : 0
          return bTime - aTime
        })
      setProjects(docs)
    }

    void loadData()
  }, [user])

  const [oauthReturnBanner, setOauthReturnBanner] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  useEffect(() => {
    if (!user?.id || !firebaseDb) return
    let cancelled = false
    ;(async () => {
      const { completeSocialOAuthRedirect } = await import('@/lib/socialLink')
      const r = await completeSocialOAuthRedirect()
      if (cancelled) return
      if (!r.handled) {
        if (r.error) setOauthReturnBanner({ kind: 'err', msg: r.error })
        return
      }

      try {
        if (r.provider === 'linkedin') {
          const patch: Record<string, unknown> = { updated_at: Date.now() }
          if (r.linkedinUrl) patch.linkedin_url = r.linkedinUrl
          if (r.linkedinData && Object.keys(r.linkedinData).length > 0) patch.linkedin_data = r.linkedinData
          await setDoc(doc(firebaseDb, FS.BUILDER_PROFILES, user.id), patch, { merge: true })
          setProfile((p: any) => ({
            ...p,
            ...(r.linkedinUrl ? { linkedin_url: r.linkedinUrl } : {}),
            ...(r.linkedinData ? { linkedin_data: r.linkedinData } : {}),
          }))
          setActiveTab('socials')
          setOauthReturnBanner({
            kind: 'ok',
            msg: r.linkedinUrl
              ? 'LinkedIn connected.'
              : 'LinkedIn linked. Add your profile URL under Socials if needed.',
          })
          return
        }

        if (r.provider === 'github') {
          const patch: Record<string, unknown> = {
            updated_at: Date.now(),
            github_verified: true,
          }
          if (r.githubUsername) patch.github_username = r.githubUsername
          if (r.githubData && Object.keys(r.githubData).length > 0) patch.github_data = r.githubData
          await setDoc(doc(firebaseDb, FS.BUILDER_PROFILES, user.id), patch, { merge: true })
          setProfile((p: any) => ({
            ...p,
            github_verified: true,
            ...(r.githubUsername ? { github_username: r.githubUsername } : {}),
            ...(r.githubData && Object.keys(r.githubData).length > 0 ? { github_data: r.githubData } : {}),
          }))
          setActiveTab('socials')
          setOauthReturnBanner({
            kind: 'ok',
            msg: r.githubUsername
              ? `GitHub connected as @${r.githubUsername}.`
              : 'GitHub linked. Enter your username above and Save if it did not auto-fill.',
          })
        }
      } catch {
        setOauthReturnBanner({
          kind: 'err',
          msg: 'Could not save the social link to your profile. Check Firestore rules and your connection.',
        })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return

    const username = normalizeUsername(profile.username)
    if (username !== profile.username) {
      setProfile((p: any) => ({ ...p, username }))
      return
    }

    if (!username) {
      setUsernameStatus('idle')
      setUsernameMsg('')
      return
    }

    if (!USERNAME_REGEX.test(username)) {
      setUsernameStatus('invalid')
      setUsernameMsg('Use 3-24 chars: lowercase letters, numbers, underscore.')
      return
    }

    if (username === initialUsername) {
      setUsernameStatus('available')
      setUsernameMsg('Your current profile handle.')
      return
    }

    if (!isFirebaseConfigured || !firebaseDb) {
      setUsernameStatus('available')
      setUsernameMsg('Looks good.')
      return
    }
    const db = firebaseDb

    let cancelled = false
    setUsernameStatus('checking')
    setUsernameMsg('Checking availability...')

    const timer = setTimeout(async () => {
      const result = await getDocs(
        query(collection(db, FS.BUILDER_PROFILES), where('username', '==', username))
      )
      const data = result.docs.map((item) => item.data())

      if (cancelled) return

      const ownedBySelf = (data || []).some((row: any) => row.user_id === user.id)
      const existsForOthers = (data || []).length > 0 && !ownedBySelf

      if (existsForOthers) {
        setUsernameStatus('taken')
        setUsernameMsg('This handle is already taken.')
      } else {
        setUsernameStatus('available')
        setUsernameMsg('Handle is available.')
      }
    }, 350)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [profile.username, user?.id, initialUsername])

  const handleSave = async () => {
    const normalizedUsername = normalizeUsername(profile.username || user?.name || 'builder')
    const usernameIsValid = USERNAME_REGEX.test(normalizedUsername)
    const usernameIsBlocked = usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'checking'

    if (!usernameIsValid || usernameIsBlocked) {
      return
    }

    setSaving(true)
    if (isFirebaseConfigured && firebaseDb && user?.id) {
      const db = firebaseDb
      await setDoc(
        doc(db, FS.BUILDER_PROFILES, user.id),
        {
          id: user.id,
          user_id: user.id,
          username: normalizedUsername,
          bio: profile.bio,
          tagline: profile.tagline,
          location: profile.location,
          website: profile.website,
          avatar_url: profile.avatar_url,
          banner_url: profile.banner_url,
          github_username: profile.github_username,
          twitter_handle: profile.twitter_handle,
          farcaster_handle: profile.farcaster_handle,
          linkedin_url: profile.linkedin_url,
          telegram_handle: profile.telegram_handle,
          skills: profile.skills,
          open_for_work: profile.open_for_work,
          hourly_rate_usd: profile.hourly_rate_usd ? parseInt(profile.hourly_rate_usd, 10) : null,
          availability: profile.availability,
          updated_at: Date.now(),
        },
        { merge: true }
      )

      await setDoc(
        doc(db, FS.USERS, user.id),
        { name: profile.name || user.name || 'builder' },
        { merge: true }
      )

      await refreshUser()
    }
    setInitialUsername(normalizedUsername)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const disableSave = saving || usernameStatus === 'checking' || usernameStatus === 'taken' || usernameStatus === 'invalid'

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {oauthReturnBanner && (
          <p
            role="status"
            className={`mb-6 text-sm font-medium px-4 py-3 rounded-xl border ${
              oauthReturnBanner.kind === 'ok'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                : 'bg-red-50 text-red-700 border-red-100'
            }`}
          >
            {oauthReturnBanner.msg}
          </p>
        )}
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Settings</h1>
            <p className="text-sm text-slate-500 mt-1.5 max-w-xl leading-relaxed">
              Manage your public builder profile, proof of work, and how you appear across Buildry.
            </p>
          </div>
          <div className="hidden md:block text-right mr-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Completion</p>
            <p className="text-sm font-black text-slate-800">{Math.round((completionScore / 6) * 100)}%</p>
          </div>
          <button
            onClick={handleSave}
            disabled={disableSave}
            className={`px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg ${
              saved
                ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                : 'bg-slate-900 text-white hover:bg-black shadow-slate-900/10'
            } disabled:opacity-40`}
          >
            {saving ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-0 border border-slate-200/80 bg-white rounded-2xl mb-8 overflow-x-auto shadow-sm">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3.5 text-[10px] font-semibold uppercase tracking-widest transition-all relative whitespace-nowrap ${
                activeTab === tab.id ? 'text-slate-900 bg-slate-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50/50'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-slate-900" />}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="fade-in">
          {activeTab === 'basics' && (
            <PublicPageTab
              profile={profile}
              setProfile={setProfile}
              userId={user?.id}
              usernameStatus={usernameStatus}
              usernameMsg={usernameMsg}
            />
          )}
          {activeTab === 'socials' && (
            <SocialsTab profile={profile} setProfile={setProfile} userId={user?.id} />
          )}
          {activeTab === 'skills' && (
            <SkillsTab profile={profile} setProfile={setProfile} />
          )}
          {activeTab === 'projects' && (
            <ProjectsTab projects={projects} setProjects={setProjects} showAdd={showAddProject} setShowAdd={setShowAddProject} userId={user?.id} />
          )}
          {activeTab === 'availability' && (
            <AvailabilityTab profile={profile} setProfile={setProfile} />
          )}
          {activeTab === 'wallets' && (
            <SettingsWalletsTab profile={profile} setProfile={setProfile} userId={user?.id} />
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Public page (avatar, handle, bio) ───────── */

function PublicPageTab({
  profile,
  setProfile,
  userId,
  usernameStatus,
  usernameMsg,
}: {
  profile: any
  setProfile: any
  userId?: string
  usernameStatus: UsernameStatus
  usernameMsg: string
}) {
  const publicProfilePath = profile.username?.trim()
    ? `/profile/${encodeURIComponent(profile.username.trim())}`
    : userId
      ? `/profile/${encodeURIComponent(userId)}`
      : '/settings'

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preview</p>
          <p className="mt-1 text-sm text-slate-600 leading-relaxed">
            This is what you edit for your public URL. Open it anytime from the sidebar account menu →{' '}
            <span className="font-semibold text-slate-800">Profile</span>.
          </p>
        </div>
        <Link
          href={publicProfilePath}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-black"
        >
          View profile
        </Link>
      </div>

      <Section title="Identity">
        <div className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-100">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-black text-slate-300">{(profile.name || '?').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <Field
                label="Avatar URL"
                value={profile.avatar_url}
                onChange={(v) => setProfile((p: any) => ({ ...p, avatar_url: v }))}
                placeholder="https://github.com/username.png"
              />
              <Field
                label="Banner URL"
                value={profile.banner_url}
                onChange={(v) => setProfile((p: any) => ({ ...p, banner_url: v }))}
                placeholder="https://..."
              />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Basic info">
        <div className="grid grid-cols-2 gap-6">
          <Field label="Display Name" value={profile.name} onChange={(v) => setProfile((p: any) => ({ ...p, name: v }))} placeholder="Your name" />
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Username</label>
            <input
              value={profile.username}
              onChange={(e) => setProfile((p: any) => ({ ...p, username: normalizeUsername(e.target.value) }))}
              placeholder="unique_handle"
              className="h-11 w-full rounded-xl border border-slate-100 bg-white px-4 text-sm font-medium text-slate-900 transition-all placeholder-slate-300 focus:border-slate-300 focus:outline-none"
            />
            {usernameMsg && (
              <p
                className={`mt-1.5 text-[10px] font-semibold ${
                  usernameStatus === 'taken' || usernameStatus === 'invalid'
                    ? 'text-red-500'
                    : usernameStatus === 'checking'
                      ? 'text-slate-400'
                      : 'text-emerald-600'
                }`}
              >
                {usernameMsg}
              </p>
            )}
          </div>
        </div>
        <Field
          label="Tagline"
          value={profile.tagline}
          onChange={(v) => setProfile((p: any) => ({ ...p, tagline: v }))}
          placeholder="e.g. Solana Dev | DeFi Builder | Open Source"
        />
        <div>
          <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Bio</label>
          <textarea
            value={profile.bio}
            onChange={(e) => setProfile((p: any) => ({ ...p, bio: e.target.value }))}
            placeholder="Tell the community about yourself, what you're building, your journey..."
            rows={4}
            className="w-full resize-none rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition-all placeholder-slate-300 focus:border-slate-300 focus:outline-none"
          />
          <p className="mt-1 text-right text-[9px] text-slate-300">{profile.bio.length}/500</p>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <Field label="Location" value={profile.location} onChange={(v) => setProfile((p: any) => ({ ...p, location: v }))} placeholder="City, Country" />
          <Field label="Website" value={profile.website} onChange={(v) => setProfile((p: any) => ({ ...p, website: v }))} placeholder="https://yoursite.com" />
        </div>
      </Section>
    </div>
  )
}

/* ─── Socials Tab ──────────────────────────────── */

function linkedInOAuthComingSoon(): boolean {
  const v = process.env.NEXT_PUBLIC_LINKEDIN_OAUTH_COMING_SOON?.trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

/** Treat as linked when we have a handle, OAuth snapshot, Firestore flag, or GitHub already on the Firebase user. */
function githubAccountLinkState(
  profile: {
    github_username?: string
    github_verified?: boolean
    github_data?: Record<string, unknown> | null
  },
  firebaseAuthHasGithubProvider: boolean
): { linked: boolean; handleLine: string } {
  const u = profile.github_username?.trim() || ''
  const login =
    profile.github_data && typeof profile.github_data.login === 'string'
      ? String(profile.github_data.login).trim()
      : ''
  const handle = u || login
  const linked =
    Boolean(handle) || profile.github_verified === true || firebaseAuthHasGithubProvider
  const handleLine = handle ? `@${handle}` : 'GitHub account connected'
  return { linked, handleLine }
}

function SocialsTab({ profile, setProfile, userId }: { profile: any; setProfile: any; userId?: string }) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)
  const [socialError, setSocialError] = useState<string | null>(null)
  const [socialHint, setSocialHint] = useState<string | null>(null)
  const linkedInOAuthOff = linkedInOAuthComingSoon()
  const [farcasterConnectKey, setFarcasterConnectKey] = useState(0)
  const [firebaseAuthHasGithub, setFirebaseAuthHasGithub] = useState(false)
  useEffect(() => {
    if (!firebaseAuth) {
      setFirebaseAuthHasGithub(false)
      return
    }
    const unsub = onAuthStateChanged(firebaseAuth, (u) => {
      setFirebaseAuthHasGithub(!!u?.providerData.some((p) => p.providerId === 'github.com'))
    })
    return () => unsub()
  }, [])
  const ghLink = githubAccountLinkState(profile, firebaseAuthHasGithub)

  const saveTwitterHandle = async () => {
    if (!userId || !firebaseDb) return
    setLoadingProvider('twitter_handle')
    setSocialError(null)
    setSocialHint(null)
    try {
      const current = profile.twitter_handle
      if (!current?.trim()) return
      await setDoc(
        doc(firebaseDb, FS.BUILDER_PROFILES, userId),
        { twitter_handle: current.trim(), updated_at: Date.now() },
        { merge: true }
      )
    } finally {
      setLoadingProvider(null)
    }
  }

  const saveGithubUsername = async () => {
    if (!userId || !firebaseDb) return
    setLoadingProvider('github_save')
    setSocialError(null)
    setSocialHint(null)
    try {
      const current = profile.github_username
      if (!current?.trim()) return
      await setDoc(
        doc(firebaseDb, FS.BUILDER_PROFILES, userId),
        { github_username: current.trim(), updated_at: Date.now() },
        { merge: true }
      )
    } finally {
      setLoadingProvider(null)
    }
  }

  const connectGitHubOAuth = async () => {
    if (!userId || !firebaseDb) return
    setLoadingProvider('github_oauth')
    setSocialError(null)
    setSocialHint(null)
    try {
      const { startGitHubLinkRedirect } = await import('@/lib/socialLink')
      const { error } = await startGitHubLinkRedirect()
      if (error) {
        setSocialError(error)
        return
      }
      setSocialHint('Redirecting to GitHub…')
    } finally {
      setLoadingProvider(null)
    }
  }

  const disconnectGitHub = async () => {
    if (!userId || !firebaseDb) return
    setLoadingProvider('github_disconnect')
    setSocialError(null)
    setSocialHint(null)
    try {
      const { unlinkGitHubProviderFromCurrentUser } = await import('@/lib/socialLink')
      const { error: unlinkErr } = await unlinkGitHubProviderFromCurrentUser()
      if (unlinkErr) {
        setSocialError(unlinkErr)
        return
      }
      await setDoc(
        doc(firebaseDb, FS.BUILDER_PROFILES, userId),
        {
          github_username: deleteField(),
          github_data: deleteField(),
          github_verified: deleteField(),
          updated_at: Date.now(),
        },
        { merge: true }
      )
      setProfile((p: any) => ({
        ...p,
        github_username: '',
        github_data: null,
        github_verified: false,
      }))
      setSocialHint('GitHub removed. You can connect another account below.')
    } finally {
      setLoadingProvider(null)
    }
  }

  const disconnectFarcaster = async () => {
    if (!userId || !firebaseDb) return
    setLoadingProvider('farcaster_disconnect')
    setSocialError(null)
    setSocialHint(null)
    try {
      await setDoc(
        doc(firebaseDb, FS.BUILDER_PROFILES, userId),
        {
          farcaster_handle: deleteField(),
          farcaster_fid: deleteField(),
          farcaster_bio: deleteField(),
          farcaster_display_name: deleteField(),
          farcaster_avatar: deleteField(),
          farcaster_data: deleteField(),
          farcaster_followers: deleteField(),
          farcaster_following: deleteField(),
          farcaster_power_badge: deleteField(),
          farcaster_verified_addresses: deleteField(),
          updated_at: Date.now(),
        },
        { merge: true }
      )
      setProfile((p: any) => ({
        ...p,
        farcaster_handle: '',
        farcaster_fid: null,
        farcaster_data: null,
      }))
      setFarcasterConnectKey((k) => k + 1)
      setSocialHint('Farcaster removed from your profile. Connect again to use a different account.')
    } finally {
      setLoadingProvider(null)
    }
  }

  const connectFarcaster = useCallback(
    async (fcProfile: any) => {
      setSocialError(null)
      setSocialHint(null)
      setLoadingProvider('farcaster')
      try {
        const fid = typeof fcProfile?.fid === 'number' ? fcProfile.fid : null
        if (!fid) {
          setSocialError('No Farcaster ID returned. Try signing in again.')
          return
        }

        let fromKit = typeof fcProfile?.username === 'string' ? fcProfile.username.trim() : ''
        if (fromKit.startsWith('!') && /^\d+$/.test(fromKit.slice(1))) {
          fromKit = '' // Auth Kit placeholder !fid — not a username
        } else {
          fromKit = fromKit.replace(/^@/, '').trim()
        }
        if (fromKit === 'undefined' || fromKit === 'null') fromKit = ''

        let enriched: Record<string, unknown> = {}
        let resolvedHandle = fromKit

        if (fid) {
          try {
            const res = await fetch(`/api/farcaster/profile?fid=${fid}`)
            if (res.ok) {
              const data = await res.json()
              if (typeof data.username === 'string' && data.username.trim()) {
                resolvedHandle = data.username.trim().replace(/^@/, '')
              }
              enriched = {
                farcaster_followers: data.followers ?? null,
                farcaster_following: data.following ?? null,
                farcaster_power_badge: data.powerBadge ?? false,
                farcaster_verified_addresses: data.verifiedAddresses ?? [],
                ...(data.bio ? { farcaster_bio: data.bio } : {}),
                ...(data.displayName ? { farcaster_display_name: data.displayName } : {}),
                ...(data.avatar ? { farcaster_avatar: data.avatar } : {}),
              }
            }
          } catch {
            // enrichment is best-effort
          }
        }

        if (!resolvedHandle) {
          setSocialError(
            'Could not load your Farcaster username. Confirm NEYNAR_API_KEY is set on the server, then try again.'
          )
          return
        }

        if (userId && firebaseDb) {
          const db = firebaseDb
          await setDoc(
            doc(db, FS.BUILDER_PROFILES, userId),
            {
              farcaster_handle: resolvedHandle,
              farcaster_fid: fid,
              farcaster_bio: fcProfile.bio || enriched.farcaster_bio || null,
              farcaster_display_name: fcProfile.displayName || enriched.farcaster_display_name || null,
              farcaster_avatar: fcProfile.pfpUrl || enriched.farcaster_avatar || null,
              ...(fcProfile.pfpUrl ? { avatar_url: fcProfile.pfpUrl } : {}),
              farcaster_data: { ...fcProfile, username: resolvedHandle },
              ...enriched,
              updated_at: Date.now(),
            },
            { merge: true }
          )
        }
        setProfile((p: any) => ({
          ...p,
          farcaster_handle: resolvedHandle,
          farcaster_fid: fid ?? p.farcaster_fid,
          farcaster_bio: fcProfile.bio || p.farcaster_bio,
          farcaster_display_name: fcProfile.displayName || p.farcaster_display_name,
          farcaster_avatar: fcProfile.pfpUrl || p.farcaster_avatar,
          ...(fcProfile.pfpUrl ? { avatar_url: fcProfile.pfpUrl } : {}),
        }))
      } finally {
        setLoadingProvider(null)
      }
    },
    [userId, setProfile]
  )

  const connectTelegram = useCallback(
    async (telegramAuth: any) => {
      setSocialError(null)
      setSocialHint(null)
      setLoadingProvider('telegram')
      try {
        if (userId && firebaseDb) {
          const db = firebaseDb
          await setDoc(
            doc(db, FS.BUILDER_PROFILES, userId),
            {
              telegram_handle: telegramAuth.username || '',
              telegram_data: telegramAuth,
              updated_at: Date.now(),
            },
            { merge: true }
          )
        }
        setProfile((p: any) => ({ ...p, telegram_handle: telegramAuth.username || p.telegram_handle }))
      } finally {
        setLoadingProvider(null)
      }
    },
    [userId, setProfile]
  )

  const saveLinkedInUrl = async () => {
    if (!userId || !firebaseDb) return
    setLoadingProvider('linkedin_save')
    setSocialError(null)
    setSocialHint(null)
    try {
      await setDoc(
        doc(firebaseDb, FS.BUILDER_PROFILES, userId),
        { linkedin_url: profile.linkedin_url?.trim() || '', updated_at: Date.now() },
        { merge: true }
      )
    } finally {
      setLoadingProvider(null)
    }
  }

  const connectLinkedInOAuth = async () => {
    if (!userId || !firebaseDb) return
    setLoadingProvider('linkedin_oauth')
    setSocialError(null)
    setSocialHint(null)
    try {
      const { startLinkedInLinkRedirect } = await import('@/lib/socialLink')
      const { error } = await startLinkedInLinkRedirect()
      if (error) {
        setSocialError(error)
        return
      }
      setSocialHint('Redirecting to LinkedIn…')
    } finally {
      setLoadingProvider(null)
    }
  }

  return (
    <Section title="Social profiles">
      <p className="text-xs text-slate-400 mb-4">
        Link the accounts you want shown on your public profile. You can connect with OAuth or enter a handle or URL
        manually.
      </p>
      {socialError && (
        <p className="text-xs font-semibold text-red-500 mb-4" role="alert">
          {socialError}
        </p>
      )}
      {socialHint && !socialError && <p className="text-xs font-medium text-slate-500 mb-4">{socialHint}</p>}
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-white border border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-lg shrink-0">🐙</div>
            <div className="flex-1 min-w-0 space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GitHub</p>
              {ghLink.linked ? (
                <>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Linked</p>
                  <p className="text-xs font-bold text-slate-600 truncate">{ghLink.handleLine}</p>
                  <p className="text-[10px] text-slate-400">
                    To use a different GitHub user, disconnect first — Buildry cannot attach two GitHub logins at once.
                  </p>
                </>
              ) : (
                <input
                  value={profile.github_username || ''}
                  onChange={(e) => setProfile((p: any) => ({ ...p, github_username: e.target.value }))}
                  placeholder="username (e.g. octocat)"
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-300 placeholder-slate-300"
                />
              )}
            </div>
            <div className="w-full sm:w-52 shrink-0 flex flex-col gap-2 sm:items-stretch">
              {ghLink.linked ? (
                <button
                  type="button"
                  onClick={disconnectGitHub}
                  disabled={loadingProvider === 'github_disconnect'}
                  className="w-full min-h-[40px] rounded-xl border border-red-200 bg-white text-[10px] font-black uppercase tracking-widest text-red-700 hover:bg-red-50 disabled:opacity-40"
                >
                  {loadingProvider === 'github_disconnect' ? '…' : 'Disconnect GitHub'}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={connectGitHubOAuth}
                    disabled={loadingProvider === 'github_oauth'}
                    className="w-full min-h-[40px] rounded-xl bg-[#24292f] text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
                  >
                    {loadingProvider === 'github_oauth' ? '…' : 'Connect GitHub'}
                  </button>
                  <button
                    type="button"
                    onClick={saveGithubUsername}
                    disabled={loadingProvider === 'github_save'}
                    className="w-full min-h-[40px] rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
                  >
                    {loadingProvider === 'github_save' ? '…' : 'Save username'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-3 p-4 rounded-xl bg-white border border-slate-100 hover:border-slate-200 transition-all">
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-lg shrink-0 sm:mb-1">𝕏</div>
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">X (Twitter)</p>
            <input
              value={profile.twitter_handle || ''}
              onChange={(e) => setProfile((p: any) => ({ ...p, twitter_handle: e.target.value }))}
              placeholder="handle (no @)"
              className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-300 placeholder-slate-300"
            />
          </div>
          <button
            type="button"
            onClick={saveTwitterHandle}
            disabled={loadingProvider === 'twitter_handle'}
            className="shrink-0 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
          >
            Save
          </button>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-100 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-lg shrink-0">💼</div>
            <div className="flex-1 min-w-0 space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">LinkedIn</p>
              {linkedInOAuthOff ? (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-[10px] text-amber-950 leading-relaxed space-y-1">
                  <p className="font-black uppercase tracking-widest text-amber-800">One-click connect — coming soon</p>
                  <p>
                    LinkedIn sign-in from here isn’t available yet. Add your public profile link below and use{' '}
                    <span className="font-semibold">Save URL</span> — it will still appear on your Buildry profile.
                  </p>
                </div>
              ) : null}
              <input
                value={profile.linkedin_url || ''}
                onChange={(e) => setProfile((p: any) => ({ ...p, linkedin_url: e.target.value }))}
                placeholder="https://www.linkedin.com/in/your-handle"
                className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-300 placeholder-slate-300"
              />
              {!linkedInOAuthOff ? (
                <p className="text-[10px] text-slate-400">Opens LinkedIn in a new step to verify your account, then returns here.</p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {linkedInOAuthOff ? (
              <button
                type="button"
                disabled
                className="px-4 py-2.5 rounded-xl bg-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest cursor-not-allowed"
              >
                Connect LinkedIn — soon
              </button>
            ) : (
              <button
                type="button"
                onClick={connectLinkedInOAuth}
                disabled={loadingProvider === 'linkedin_oauth'}
                className="px-4 py-2.5 rounded-xl bg-[#0A66C2] text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
              >
                {loadingProvider === 'linkedin_oauth' ? '…' : 'Connect LinkedIn'}
              </button>
            )}
            <button
              type="button"
              onClick={saveLinkedInUrl}
              disabled={loadingProvider === 'linkedin_save'}
              className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
            >
              {loadingProvider === 'linkedin_save' ? '…' : 'Save URL'}
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start gap-4 p-4 rounded-xl bg-white border border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-lg shrink-0">🟣</div>
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Farcaster</p>
            <p className="text-xs font-bold text-slate-600 truncate">
              {profile.farcaster_handle ? `@${profile.farcaster_handle}` : 'Not connected'}
            </p>
            <p className="text-[10px] text-slate-400">
              Links your Farcaster identity to this profile (separate from how you log into Buildry). If sign-in fails in
              Warpcast, check that your app’s domain in the{' '}
              <a
                href="https://farcaster.xyz/~/developers"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-600 font-semibold hover:underline"
              >
                developer portal
              </a>{' '}
              matches the site URL you use (with or without <span className="font-mono">www</span>).
            </p>
          </div>
          <div className="w-full sm:w-52 shrink-0 space-y-2">
            {profile.farcaster_handle ? (
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Linked</p>
                <p className="text-[10px] text-slate-400">
                  Disconnect to link a different Farcaster — the sign-in widget remembers your last Warpcast session until
                  you remove the link here.
                </p>
                <button
                  type="button"
                  onClick={disconnectFarcaster}
                  disabled={loadingProvider === 'farcaster_disconnect'}
                  className="w-full min-h-[40px] rounded-xl border border-red-200 bg-white text-[10px] font-black uppercase tracking-widest text-red-700 hover:bg-red-50 disabled:opacity-40"
                >
                  {loadingProvider === 'farcaster_disconnect' ? '…' : 'Disconnect Farcaster'}
                </button>
              </div>
            ) : loadingProvider === 'farcaster' ? (
              <div className="w-full min-h-[40px] rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                Saving…
              </div>
            ) : (
              <FarcasterConnect
                key={farcasterConnectKey}
                onConnected={connectFarcaster}
                onError={(m) =>
                  setSocialError(m == null || m === '' ? 'Farcaster sign-in failed' : String(m))
                }
              />
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-lg shrink-0">✈️</div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Telegram</p>
            <p className="text-xs font-bold text-slate-600 truncate">{profile.telegram_handle || 'Not connected'}</p>
          </div>
          <TelegramConnect
            botName={process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || ''}
            onConnected={connectTelegram}
          />
        </div>
      </div>
    </Section>
  )
}

/* ─── Skills Tab ──────────────────────────────── */

function SkillsTab({ profile, setProfile }: { profile: any; setProfile: any }) {
  const [newSkill, setNewSkill] = useState('')

  const SUGGESTED = ['React', 'TypeScript', 'Rust', 'Solana', 'Solidity', 'Node.js', 'Python', 'Go', 'Figma', 'DeFi', 'NFTs', 'Smart Contracts', 'Anchor', 'Next.js', 'GraphQL', 'AWS', 'Docker', 'Tailwind', 'Web3.js', 'Ethers.js']

  const addSkill = (skill: string) => {
    const trimmed = skill.trim()
    if (!trimmed || profile.skills.includes(trimmed)) return
    setProfile((p: any) => ({ ...p, skills: [...p.skills, trimmed] }))
    setNewSkill('')
  }

  const removeSkill = (skill: string) => {
    setProfile((p: any) => ({ ...p, skills: p.skills.filter((s: string) => s !== skill) }))
  }

  return (
    <Section title="Skills & Tech Stack">
      <p className="text-xs text-slate-400 mb-6">Add your skills to help others find you. These show as tags on your profile.</p>

      {/* Current skills */}
      {profile.skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {profile.skills.map((skill: string) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-bold group"
            >
              {skill}
              <button onClick={() => removeSkill(skill)} className="text-slate-400 hover:text-red-400 transition-colors ml-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add custom */}
      <div className="flex items-center gap-3 mb-8">
        <input
          value={newSkill}
          onChange={e => setNewSkill(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill(newSkill))}
          placeholder="Type a skill and press Enter..."
          className="flex-1 h-11 px-4 rounded-xl bg-white border border-slate-100 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-300 placeholder-slate-300"
        />
        <button
          onClick={() => addSkill(newSkill)}
          disabled={!newSkill.trim()}
          className="h-11 px-5 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all disabled:opacity-30"
        >
          Add
        </button>
      </div>

      {/* Suggestions */}
      <div>
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-3">Suggested</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED.filter(s => !profile.skills.includes(s)).map(s => (
            <button
              key={s}
              onClick={() => addSkill(s)}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-100 text-[11px] font-bold text-slate-400 hover:border-slate-300 hover:text-slate-700 transition-all"
            >
              + {s}
            </button>
          ))}
        </div>
      </div>
    </Section>
  )
}

/* ─── Projects Tab ──────────────────────────────── */

function ProjectsTab({ projects, setProjects, showAdd, setShowAdd, userId }: {
  projects: any[]; setProjects: any; showAdd: boolean; setShowAdd: any; userId?: string
}) {
  const [form, setForm] = useState({ title: '', description: '', github_url: '', live_url: '', category: 'DeFi', status: 'building', tags: '' })

  const handleAdd = async () => {
    if (!userId || !form.title || !firebaseDb) return
    const db = firebaseDb
    const docRef = await addDoc(collection(db, FS.PROJECTS), {
      builder_id: userId,
      title: form.title,
      description: form.description,
      github_url: form.github_url || null,
      live_url: form.live_url || null,
      category: form.category,
      status: form.status,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      created_at: Date.now(),
    })
    setProjects((prev: any[]) => [{ id: docRef.id, ...form, tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean) }, ...prev])
    setForm({ title: '', description: '', github_url: '', live_url: '', category: 'DeFi', status: 'building', tags: '' })
    setShowAdd(false)
  }

  return (
    <Section title="Your Projects">
      <p className="text-xs text-slate-400 mb-6">Showcase what you've built. Projects appear on your public profile.</p>

      <button
        onClick={() => setShowAdd(!showAdd)}
        className="w-full py-5 mb-6 border border-dashed border-slate-200 hover:border-slate-300 hover:bg-white rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all"
      >
        + Add a Project
      </button>

      {showAdd && (
        <div className="p-6 rounded-2xl border border-slate-200 bg-white mb-6 space-y-4 fade-in">
          <div className="grid grid-cols-2 gap-4">
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Project name"
              className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-200 placeholder-slate-300" />
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium text-slate-900 focus:outline-none">
              {['DeFi', 'NFT', 'Infrastructure', 'Tooling', 'Gaming', 'Social', 'DAOs', 'Other'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What does this project do?" rows={3}
            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-200 placeholder-slate-300 resize-none" />
          <div className="grid grid-cols-2 gap-4">
            <input value={form.github_url} onChange={e => setForm(f => ({ ...f, github_url: e.target.value }))} placeholder="GitHub URL"
              className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium text-slate-900 focus:outline-none placeholder-slate-300" />
            <input value={form.live_url} onChange={e => setForm(f => ({ ...f, live_url: e.target.value }))} placeholder="Live URL"
              className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium text-slate-900 focus:outline-none placeholder-slate-300" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium text-slate-900 focus:outline-none">
              <option value="idea">Idea</option>
              <option value="building">Building</option>
              <option value="launched">Launched</option>
              <option value="completed">Completed</option>
            </select>
            <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="Tags (comma-separated)"
              className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium text-slate-900 focus:outline-none placeholder-slate-300" />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowAdd(false)} className="px-5 py-2 text-sm font-bold text-slate-400">Cancel</button>
            <button onClick={handleAdd} disabled={!form.title}
              className="bg-slate-900 text-white px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all disabled:opacity-30">
              Add Project
            </button>
          </div>
        </div>
      )}

      {/* Project list */}
      {projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg font-black text-slate-200">No projects yet</p>
          <p className="text-sm text-slate-300 mt-1">Add your first project to showcase your work.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((proj, i) => (
            <div key={proj.id || i} className="p-5 rounded-2xl border border-slate-100 bg-white flex items-start justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${proj.status === 'launched' ? 'bg-emerald-500' : proj.status === 'building' ? 'bg-amber-500' : 'bg-slate-300'}`} />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{proj.status}</span>
                  <span className="text-[9px] font-bold text-slate-300">{proj.category}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{proj.title}</h3>
                {proj.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{proj.description}</p>}
                {proj.tags && proj.tags.length > 0 && (
                  <div className="flex gap-1.5 mt-2">
                    {proj.tags.map((t: string) => (
                      <span key={t} className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-50 text-slate-400">{t}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                {proj.github_url && (
                  <a href={proj.github_url} target="_blank" rel="noopener" className="text-[10px] font-bold text-slate-400 hover:text-slate-600">GitHub</a>
                )}
                {proj.live_url && (
                  <a href={proj.live_url} target="_blank" rel="noopener" className="text-[10px] font-bold text-blue-500 hover:text-blue-700">Live</a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

/* ─── Availability Tab ──────────────────────────── */

function AvailabilityTab({ profile, setProfile }: { profile: any; setProfile: any }) {
  return (
    <Section title="Work Availability">
      <p className="text-xs text-slate-400 mb-6">Let others know you're open for work, freelance gigs, or co-founder matching.</p>

      <div className="space-y-6">
        {/* Open for work toggle */}
        <div className="flex items-center justify-between p-5 rounded-xl bg-white border border-slate-100">
          <div>
            <p className="text-sm font-bold text-slate-900">Open for work</p>
            <p className="text-xs text-slate-400 mt-0.5">Show a green badge on your profile</p>
          </div>
          <button
            onClick={() => setProfile((p: any) => ({ ...p, open_for_work: !p.open_for_work }))}
            className={`w-12 h-7 rounded-full transition-all relative ${
              profile.open_for_work ? 'bg-emerald-500' : 'bg-slate-200'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-1 transition-all ${
              profile.open_for_work ? 'left-6' : 'left-1'
            }`} />
          </button>
        </div>

        {profile.open_for_work && (
          <div className="grid grid-cols-2 gap-6 fade-in">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Hourly Rate (USD)</label>
              <input
                value={profile.hourly_rate_usd}
                onChange={e => setProfile((p: any) => ({ ...p, hourly_rate_usd: e.target.value }))}
                placeholder="e.g. 150"
                type="number"
                className="w-full h-11 px-4 rounded-xl bg-white border border-slate-100 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-300 placeholder-slate-300"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Availability</label>
              <select
                value={profile.availability}
                onChange={e => setProfile((p: any) => ({ ...p, availability: e.target.value }))}
                className="w-full h-11 px-4 rounded-xl bg-white border border-slate-100 text-sm font-medium text-slate-900 focus:outline-none"
              >
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="one_off">One-off projects</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </Section>
  )
}

/* ─── Shared components ─────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm">
      <h2 className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] mb-6">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 px-4 rounded-xl bg-white border border-slate-100 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-300 placeholder-slate-300 transition-all"
      />
    </div>
  )
}
