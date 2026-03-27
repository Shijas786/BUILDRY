'use client'

import React, { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'

interface ConnectBridgeModalProps {
  isOpen: boolean
  onClose: () => void
  builder: {
    builderName: string
    builderUsername: string
    avatar: string
    score: number
    role: string
    symbol: string
    mint: string
  }
}

export default function ConnectBridgeModal({ isOpen, onClose, builder }: ConnectBridgeModalProps) {
  const [step, setStep] = useState<'options' | 'hire'>('options')
  const [taskDescription, setTaskDescription] = useState('')

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] animate-in fade-in duration-300" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-[32px] shadow-2xl z-[101] overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
          
          {/* Header Area */}
          <div className="bg-slate-50 p-8 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-md bg-white">
                <img src={builder.avatar} alt={builder.builderName} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-black text-slate-900 leading-tight">{builder.builderName}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest">REPU {builder.score?.toFixed(1) || '9.2'}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">@{builder.builderUsername}</span>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          <div className="p-8">
            {step === 'options' ? (
              <div className="flex flex-col gap-4">
                <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Bridge Connection</div>
                
                {/* Social Bridges */}
                <div className="grid grid-cols-2 gap-4">
                  <a 
                    href={`https://warpcast.com/${builder.builderUsername}`} 
                    target="_blank"
                    className="flex items-center justify-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl hover:border-purple-200 hover:bg-purple-50 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">F</div>
                    <div className="text-sm font-black text-slate-700 group-hover:text-purple-700">Farcaster</div>
                  </a>
                  <a 
                    href={`https://twitter.com/${builder.builderUsername}`} 
                    target="_blank"
                    className="flex items-center justify-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-200 hover:bg-blue-50 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">𝕏</div>
                    <div className="text-sm font-black text-slate-700 group-hover:text-blue-700">Twitter</div>
                  </a>
                </div>

                <div className="h-[1px] bg-slate-100 my-4" />

                {/* The 'Wow' Bridge: Hire Builder */}
                <button 
                  onClick={() => setStep('hire')}
                  className="w-full flex items-center justify-between p-6 bg-blue-600 text-white rounded-3xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-200 hover:-translate-y-1 transform group"
                >
                  <div className="text-left">
                    <div className="text-sm font-black uppercase tracking-widest mb-1">Hire {builder.builderName.split(' ')[0]}</div>
                    <div className="text-[10px] text-blue-200 font-medium">Fiverr-style service bridge</div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </div>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div>
                  <button onClick={() => setStep('options')} className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 hover:underline flex items-center gap-2">
                    ← Back to choices
                  </button>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Define Your Request</h3>
                  <p className="text-xs text-slate-500 mt-1">Buildry bridges the gap with reputation-backed escrow.</p>
                </div>

                <div className="space-y-4">
                  <textarea 
                    placeholder="Describe specific needs (e.g., UI Review, Smart Contract Audit...)"
                    className="w-full h-32 p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-sm font-medium"
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                  />
                  
                  <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Commitment</div>
                      <div className="text-xs font-black text-slate-800">Stake 100 ${builder.symbol}</div>
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium w-32 text-right">
                      Funds are held in reputation escrow until task completion.
                    </div>
                  </div>
                </div>

                <button 
                  className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all shadow-md active:scale-95 translate-y-0"
                >
                  Initialize Hiring Bridge
                </button>
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-4 text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Powered by Reputation Index & Bags Protocol</p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
