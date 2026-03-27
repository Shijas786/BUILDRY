import React from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { getProfile } from '@/lib/talent'
import { getTokensByCreator } from '@/lib/bags'
import mockProjects from '@/lib/mockProjects.json'
import BuilderBackingPanel from '@/components/BuilderBackingPanel'
import OnboardingChecklist from '@/components/OnboardingChecklist'
import OpenToWorkToggle from '@/components/OpenToWorkToggle'
import BuilderProfileTabs from '@/components/BuilderProfileTabs'

export default async function BuilderProfile({ params }: { params: { username: string } }) {
  const username = params.username
  const profile = await getProfile(username)

  if (!profile) {
    return (
      <div className="min-h-screen bg-white text-slate-900 px-8">
        <Navbar />
        <main className="max-w-xl mx-auto py-48 text-center space-y-12">
          <div className="w-24 h-24 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-center text-4xl mx-auto shadow-sm">🕵️‍♂️</div>
          <div className="space-y-4">
            <h1 className="text-4xl font-black tracking-tight uppercase">Profile Not Found</h1>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-relaxed">
              We couldn't resolve <span className="text-slate-900">@{username}</span> on the Talent Protocol. <br/> 
              They may need to mint their Talent Passport first.
            </p>
          </div>
          <div className="pt-8">
            <Link 
              href="/"
              className="bg-slate-900 text-white px-10 py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10"
            >
              Back to Discovery
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const bagsTokens = await getTokensByCreator(profile.id)
  const primaryToken = bagsTokens[0]

  const builderProjects = mockProjects.filter(p => p.creator === profile.name)

  return (
    <div className="min-h-screen bg-white text-slate-900 px-8">
      <Navbar />

      <main className="max-w-7xl mx-auto py-16">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row gap-12 items-start mb-20">
          <div className="flex-1 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
            <div className="w-40 h-40 rounded-full border-4 border-slate-50 overflow-hidden shadow-premium relative bg-slate-100 flex items-center justify-center font-black text-3xl text-slate-300">
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                profile.name.charAt(0)
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
            </div>
            
            <div className="flex-1 space-y-4 pt-4">
              <div className="flex items-center gap-3 justify-center md:justify-start">
                <h1 className="text-5xl font-black tracking-tight uppercase text-slate-900 truncate max-w-xl">{profile.name}</h1>
                {profile.verified && <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-[10px] text-white">✓</span>}
              </div>
              <p className="text-xl font-bold text-slate-400 tracking-tight">@{profile.username} · Senior Protocol Architect</p>
              
              <div className="flex flex-wrap gap-2 justify-center md:justify-start pt-2">
                {['Solana', 'Rust', 'React', 'DeFi'].map(tag => (
                  <span key={tag} className="px-3 py-1 bg-slate-50 border border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-500">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Open to Work Toggle */}
              <div className="pt-3">
                <OpenToWorkToggle />
              </div>
            </div>
          </div>

          <div className="w-full md:w-auto flex flex-col items-center md:items-end gap-3">
             <div className="border border-slate-100 p-8 text-center min-w-[200px]">
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] mb-3">Talent Score</p>
                <p className="text-6xl font-black text-slate-900 tabular-nums">{profile.score}</p>
                <div className="mt-4 flex items-center justify-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-widest">
                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />↑ 12% Growth
                </div>
             </div>
             <div className="flex items-center gap-2">
               <button className="text-slate-400 w-10 h-10 border border-slate-100 flex items-center justify-center hover:bg-slate-50 transition-all text-sm">𝕏</button>
               <button className="text-slate-400 w-10 h-10 border border-slate-100 flex items-center justify-center hover:bg-slate-50 transition-all text-sm">🟣</button>
               <Link href="/settings" className="bg-slate-50 text-slate-900 border border-slate-100 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Edit Profile</Link>
               <button className="bg-slate-900 text-white px-6 py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">Connect</button>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-16">
          <BuilderProfileTabs 
            bagsTokens={bagsTokens} 
            builderName={profile.name}
            projects={builderProjects}
            onboardingChecklist={<OnboardingChecklist />}
          />

          <div className="xl:col-span-1">
            {primaryToken ? (
              <BuilderBackingPanel 
                builderName={profile.name} 
                tokenName={primaryToken.symbol} 
                tokenPrice={primaryToken.price.toString()} 
                tokenMint={primaryToken.mint}
              />
            ) : (
              <div className="border border-dashed border-slate-200 p-10 text-center rounded-[32px]">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-relaxed">
                  Trading suspended for this builder profile. <br/><br/>
                  Awaiting Bags.fm token deployment.
                </p>
                <button className="mt-8 text-[9px] font-black text-blue-600 uppercase tracking-widest border-b border-blue-600">Notify when live</button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
