'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthProvider'
import { useRoleStore, type UserRole } from '@/store/role'
import { isSupabaseConfigured, createAuthClient } from '@/lib/auth'
import FarcasterConnect from '@/components/FarcasterConnect'
import TelegramConnect from '@/components/TelegramConnect'

type SettingsTab = 'profile' | 'socials' | 'skills' | 'projects' | 'availability' | 'wallets'

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'skills', label: 'Skills & Stack' },
  { id: 'socials', label: 'Socials' },
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
  const { activeRole, setActiveRole } = useRoleStore()
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
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
    twitter_handle: '',
    farcaster_handle: '',
    linkedin_url: '',
    telegram_handle: '',
    skills: [] as string[],
    open_for_work: false,
    hourly_rate_usd: '',
    availability: 'full_time',
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
    if (!isSupabaseConfigured || !user?.id) return
    const supabase = createAuthClient()
    if (!supabase) return

    supabase
      .from('builder_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const normalized = normalizeUsername(data.username || '')
          setProfile(p => ({
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
            twitter_handle: data.twitter_handle || '',
            farcaster_handle: data.farcaster_handle || '',
            linkedin_url: data.linkedin_url || '',
            telegram_handle: data.telegram_handle || '',
            skills: data.skills || [],
            open_for_work: data.open_for_work || false,
            hourly_rate_usd: data.hourly_rate_usd?.toString() || '',
            availability: data.availability || 'full_time',
          }))
          setInitialUsername(normalized)
        }
      })

    supabase
      .from('projects')
      .select('*')
      .eq('builder_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setProjects(data || []))
  }, [user])

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

    if (!isSupabaseConfigured) {
      setUsernameStatus('available')
      setUsernameMsg('Looks good.')
      return
    }

    const supabase = createAuthClient()
    if (!supabase) return

    let cancelled = false
    setUsernameStatus('checking')
    setUsernameMsg('Checking availability...')

    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('builder_profiles')
        .select('user_id')
        .eq('username', username)
        .limit(1)

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
    if (isSupabaseConfigured && user?.id) {
      const supabase = createAuthClient()
      if (supabase) {
        await supabase.from('builder_profiles').upsert({
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
          hourly_rate_usd: profile.hourly_rate_usd ? parseInt(profile.hourly_rate_usd) : null,
          availability: profile.availability,
        }, { onConflict: 'user_id' })

        await supabase.from('users').update({ name: profile.name }).eq('id', user.id)
        await refreshUser()
      }
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
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Edit Profile</h1>
            <p className="text-xs text-slate-400 mt-1">Build your identity in sequence: story, proof, then opportunities.</p>
          </div>
          <div className="hidden md:block text-right mr-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-1">Profile completion</p>
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
        <div className="flex gap-0 border border-slate-100 bg-white rounded-2xl mb-8 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${
                activeTab === tab.id ? 'text-slate-900 bg-slate-50/70' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-50/40'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-900" />}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="fade-in">
          {activeTab === 'profile' && (
            <ProfileTab
              profile={profile}
              setProfile={setProfile}
              activeRole={activeRole}
              setActiveRole={setActiveRole}
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
            <WalletsTab />
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Profile Tab ──────────────────────────────── */

function ProfileTab({ profile, setProfile, activeRole, setActiveRole, usernameStatus, usernameMsg }: {
  profile: any
  setProfile: any
  activeRole: UserRole
  setActiveRole: (r: UserRole) => void
  usernameStatus: UsernameStatus
  usernameMsg: string
}) {
  return (
    <div className="space-y-8">
      {/* Avatar + Banner */}
      <Section title="Identity">
        <div className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-slate-100 border-2 border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-black text-slate-300">{(profile.name || '?').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <Field label="Avatar URL" value={profile.avatar_url} onChange={v => setProfile((p: any) => ({ ...p, avatar_url: v }))} placeholder="https://github.com/username.png" />
              <Field label="Banner URL" value={profile.banner_url} onChange={v => setProfile((p: any) => ({ ...p, banner_url: v }))} placeholder="https://..." />
            </div>
          </div>
        </div>
      </Section>

      {/* Basic info */}
      <Section title="Basic Info">
        <div className="grid grid-cols-2 gap-6">
          <Field label="Display Name" value={profile.name} onChange={v => setProfile((p: any) => ({ ...p, name: v }))} placeholder="Your name" />
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Username</label>
            <input
              value={profile.username}
              onChange={e => setProfile((p: any) => ({ ...p, username: normalizeUsername(e.target.value) }))}
              placeholder="unique_handle"
              className="w-full h-11 px-4 rounded-xl bg-white border border-slate-100 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-300 placeholder-slate-300 transition-all"
            />
            {usernameMsg && (
              <p
                className={`text-[10px] mt-1.5 font-semibold ${
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
        <Field label="Tagline" value={profile.tagline} onChange={v => setProfile((p: any) => ({ ...p, tagline: v }))} placeholder="e.g. Solana Dev | DeFi Builder | Open Source" />
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Bio</label>
          <textarea
            value={profile.bio}
            onChange={e => setProfile((p: any) => ({ ...p, bio: e.target.value }))}
            placeholder="Tell the community about yourself, what you're building, your journey..."
            rows={4}
            className="w-full px-4 py-3 rounded-xl bg-white border border-slate-100 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-300 placeholder-slate-300 resize-none transition-all"
          />
          <p className="text-[9px] text-slate-300 mt-1 text-right">{profile.bio.length}/500</p>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <Field label="Location" value={profile.location} onChange={v => setProfile((p: any) => ({ ...p, location: v }))} placeholder="City, Country" />
          <Field label="Website" value={profile.website} onChange={v => setProfile((p: any) => ({ ...p, website: v }))} placeholder="https://yoursite.com" />
        </div>
      </Section>

      {/* Role */}
      <Section title="Your Role">
        <p className="text-xs text-slate-400 mb-4">This changes your sidebar navigation and feed. Switch anytime.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(['developer', 'founder', 'investor', 'recruiter'] as UserRole[]).map(role => (
            <button
              key={role}
              onClick={() => setActiveRole(role)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                activeRole === role
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
              }`}
            >
              <p className={`text-sm font-bold capitalize ${activeRole === role ? 'text-white' : 'text-slate-900'}`}>{role}</p>
            </button>
          ))}
        </div>
      </Section>
    </div>
  )
}

/* ─── Socials Tab ──────────────────────────────── */

function SocialsTab({ profile, setProfile, userId }: { profile: any; setProfile: any; userId?: string }) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)

  const connectSupabaseProvider = async (provider: 'github' | 'twitter' | 'linkedin_oidc') => {
    const supabase = createAuthClient()
    if (!supabase) return
    setLoadingProvider(provider)
    const redirectTo = `${window.location.origin}/auth/social-callback?provider=${provider}`
    await supabase.auth.linkIdentity({
      provider,
      options: { redirectTo },
    } as any)
    setLoadingProvider(null)
  }

  const connectFarcaster = async (fcProfile: any) => {
    setLoadingProvider('farcaster')
    try {
      await fetch('/api/auth/farcaster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          profile: fcProfile,
        }),
      })
      setProfile((p: any) => ({ ...p, farcaster_handle: fcProfile.username || p.farcaster_handle }))
    } finally {
      setLoadingProvider(null)
    }
  }

  const connectTelegram = async (telegramAuth: any) => {
    setLoadingProvider('telegram')
    try {
      await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          telegramAuth,
        }),
      })
      setProfile((p: any) => ({ ...p, telegram_handle: telegramAuth.username || p.telegram_handle }))
    } finally {
      setLoadingProvider(null)
    }
  }

  const items = [
    { key: 'github_username', label: 'GitHub', icon: '🐙', value: profile.github_username, connect: () => connectSupabaseProvider('github') },
    { key: 'twitter_handle', label: 'X (Twitter)', icon: '𝕏', value: profile.twitter_handle, connect: () => connectSupabaseProvider('twitter') },
    { key: 'linkedin_url', label: 'LinkedIn', icon: '💼', value: profile.linkedin_url, connect: () => connectSupabaseProvider('linkedin_oidc') },
  ]

  return (
    <Section title="Connected Socials (OAuth)">
      <p className="text-xs text-slate-400 mb-6">
        Connect your socials via OAuth for verified identity. GitHub, X, and LinkedIn use Supabase OAuth; Farcaster and Telegram use their native auth flows.
      </p>
      <div className="space-y-4">
        {items.map((s) => (
          <div key={s.key} className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-100 hover:border-slate-200 transition-all">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-lg shrink-0">{s.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
              <p className="text-xs font-bold text-slate-600 truncate">{s.value || 'Not connected'}</p>
            </div>
            <button
              onClick={s.connect}
              disabled={loadingProvider === s.key || loadingProvider === (s.label === 'LinkedIn' ? 'linkedin_oidc' : s.key)}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
            >
              {s.value ? 'Reconnect' : 'Connect'}
            </button>
          </div>
        ))}

        <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-lg shrink-0">🟣</div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Farcaster</p>
            <p className="text-xs font-bold text-slate-600 truncate">{profile.farcaster_handle || 'Not connected'}</p>
          </div>
          <FarcasterConnect onConnected={connectFarcaster} />
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
    if (!userId || !form.title) return
    if (isSupabaseConfigured) {
      const supabase = createAuthClient()
      if (supabase) {
        const { data } = await supabase.from('projects').insert({
          builder_id: userId,
          title: form.title,
          description: form.description,
          github_url: form.github_url || null,
          live_url: form.live_url || null,
          category: form.category,
          status: form.status,
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        }).select().single()
        if (data) setProjects((prev: any[]) => [data, ...prev])
      }
    }
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

/* ─── Wallets Tab ──────────────────────────────── */

function WalletsTab() {
  return (
    <Section title="Connected Wallets">
      <p className="text-xs text-slate-400 mb-6">Wallets linked here are verified on your profile and used for onchain reputation scoring.</p>

      <div className="space-y-4">
        {[
          { address: '0x6c31...be3154', chain: 'EVM', primary: true },
          { address: '8F2a...k9Lq', chain: 'SOL', primary: false },
        ].map((w, i) => (
          <div key={i} className="p-5 rounded-xl bg-white border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">
                {w.chain}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 font-mono">{w.address}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Verified</p>
              </div>
            </div>
            {w.primary ? (
              <span className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-lg">Primary</span>
            ) : (
              <button className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider">Set Primary</button>
            )}
          </div>
        ))}

        <button className="w-full py-5 border border-dashed border-slate-200 hover:border-slate-300 hover:bg-white rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all">
          + Connect Wallet
        </button>
      </div>
    </Section>
  )
}

/* ─── Shared components ─────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
      <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">{title}</h2>
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
