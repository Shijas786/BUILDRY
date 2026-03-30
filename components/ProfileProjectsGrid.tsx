'use client'

import Link from 'next/link'
import { useState } from 'react'
import { arrayUnion, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { firebaseDb, isFirebaseConfigured } from '@/lib/firebaseClient'
import { FS } from '@/lib/firestoreCollections'

function primaryProjectUrl(proj: { live_url?: string | null; github_url?: string | null }) {
  const live = proj.live_url?.trim()
  const gh = proj.github_url?.trim()
  if (live) return live
  if (gh) return gh
  return null
}

export default function ProfileProjectsGrid({
  projects,
  isOwner = false,
  builderProfileDocId,
  onRefresh,
}: {
  projects: any[]
  isOwner?: boolean
  builderProfileDocId?: string
  onRefresh?: () => void
}) {
  const [busyId, setBusyId] = useState<string | null>(null)

  const handleRemoveManual = async (id: string) => {
    if (!isFirebaseConfigured || !firebaseDb) return
    if (!window.confirm('Remove this project from your profile?')) return
    setBusyId(id)
    try {
      await deleteDoc(doc(firebaseDb, FS.PROJECTS, id))
      onRefresh?.()
    } finally {
      setBusyId(null)
    }
  }

  const handleHideGithubRepo = async (proj: any) => {
    if (!isFirebaseConfigured || !firebaseDb || !builderProfileDocId) return
    const rid =
      typeof proj.github_repo_id === 'number'
        ? proj.github_repo_id
        : Number(proj.github_repo_id)
    if (!Number.isFinite(rid)) return
    if (!window.confirm('Hide this repository on your profile? It will stay on GitHub.')) return
    setBusyId(proj.id)
    try {
      await updateDoc(doc(firebaseDb, FS.BUILDER_PROFILES, builderProfileDocId), {
        github_hidden_repo_ids: arrayUnion(rid),
      })
      onRefresh?.()
    } finally {
      setBusyId(null)
    }
  }

  if (!projects.length) {
    return (
      <div className="text-center py-16">
        <p className="text-lg font-black text-slate-200 mb-2">No projects yet</p>
        <p className="text-sm text-slate-400">Projects will appear here once added or synced from GitHub.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {projects.map((proj) => {
        const url = primaryProjectUrl(proj)
        const busy = busyId === proj.id
        return (
          <div
            key={proj.id}
            className="p-5 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all overflow-hidden flex flex-col"
          >
            {proj.image_url ? (
              <div className="aspect-[2/1] w-full -mx-5 -mt-5 mb-4 max-h-40 overflow-hidden bg-slate-100">
                <img src={proj.image_url} alt="" className="h-full w-full object-cover" />
              </div>
            ) : null}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${proj.status === 'launched' ? 'bg-emerald-500' : proj.status === 'building' ? 'bg-amber-500' : 'bg-slate-300'}`}
              />
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                {proj.status}
              </span>
              {proj.source && (
                <span
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${proj.source === 'github' ? 'text-violet-600 bg-violet-50' : 'text-slate-500 bg-slate-50'}`}
                >
                  {proj.source}
                </span>
              )}
              {proj.has_token && (
                <span className="text-[9px] font-black uppercase text-blue-500 bg-blue-50 px-2 py-0.5 rounded">
                  Token
                </span>
              )}
            </div>
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-base font-bold text-slate-900 mb-1 hover:text-blue-600 transition-colors"
              >
                {proj.title}
              </a>
            ) : (
              <h3 className="text-base font-bold text-slate-900 mb-1">{proj.title}</h3>
            )}
            <p className="text-xs text-slate-400 line-clamp-2 flex-1">{proj.description}</p>
            {proj.tags && (
              <div className="flex gap-1.5 mt-3 flex-wrap">
                {proj.tags.slice(0, 4).map((t: string) => (
                  <span key={t} className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-50 text-slate-400">
                    {t}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-3 gap-y-2">
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800"
                >
                  Open
                </a>
              )}
              {proj.live_url?.trim() && proj.github_url?.trim() && (
                <a
                  href={proj.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600"
                >
                  GitHub
                </a>
              )}
              {isOwner && proj.source === 'manual' && (
                <>
                  <Link
                    href={`/settings?tab=projects&edit=${encodeURIComponent(proj.id)}`}
                    className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-800"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleRemoveManual(proj.id)}
                    className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-700 disabled:opacity-40"
                  >
                    {busy ? '…' : 'Remove'}
                  </button>
                </>
              )}
              {isOwner && proj.source === 'github' && builderProfileDocId && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleHideGithubRepo(proj)}
                  className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-700 disabled:opacity-40"
                >
                  {busy ? '…' : 'Hide from profile'}
                </button>
              )}
              {isOwner && proj.source === 'github' && !builderProfileDocId && (
                <span className="text-[9px] text-amber-600">Save your builder profile in Settings to hide repos.</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
