'use client'

import React, { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { VersionedTransaction, Connection } from '@solana/web3.js'
import { prepareLaunchTransaction } from '@/app/actions/bags'

interface LaunchTokenModalProps {
  isOpen: boolean
  onClose: () => void
  builderName: string
}

export default function LaunchTokenModal({ isOpen, onClose, builderName }: LaunchTokenModalProps) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: `${builderName} Identity`,
    symbol: builderName.toUpperCase().slice(0, 4),
    description: `The official reputation-backed currency of ${builderName}. Supported by Buildry and Bags.fm.`,
    image: `https://unavatar.io/github/${builderName.toLowerCase()}`
  })
  const [isLaunching, setIsLaunching] = useState(false)
  
  // Connect to the user's wallet via AppKit's Solana Adapter
  const { publicKey, signTransaction, sendTransaction } = useWallet()

  if (!isOpen) return null

  const handleLaunch = async () => {
    if (!publicKey) {
      alert("Please connect your wallet first to deploy a token.")
      return
    }

    setIsLaunching(true)
    try {
      // 1. Prepare transaction on the server (Secure API Keys)
      const res = await prepareLaunchTransaction(
        formData.name,
        formData.symbol,
        formData.description,
        formData.image,
        publicKey.toBase58()
      )

      if (!res.success || !res.transactionBase64) {
        throw new Error(res.error || 'Failed to prepare launch transaction')
      }

      // 2. Deserialize Transaction
      const txBuffer = Buffer.from(res.transactionBase64, 'base64')
      const versionedTx = VersionedTransaction.deserialize(txBuffer)

      // 3. User Signs and Broadcasts the Transaction (Jito is recommended via Bags SDK but we can send via standard connection or let the wallet handle it)
      const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed')
      
      let signature: string;
      if (sendTransaction) {
         signature = await sendTransaction(versionedTx, connection)
      } else if (signTransaction) {
         const signedTx = await signTransaction(versionedTx)
         signature = await connection.sendRawTransaction(signedTx.serialize())
      } else {
         throw new Error("Wallet does not support signing.")
      }
      
      console.log('Token Deployed! Mint:', res.tokenMint, 'Signature:', signature)
      alert(`Token successfully deployed on Solana! Mint: ${res.tokenMint}`)
      onClose()
    } catch (err: any) {
      console.error(err)
      alert("Launch failed: " + (err.message || 'Unknown error'))
    } finally {
      setIsLaunching(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-white/40 backdrop-blur-xl" onClick={onClose} />
      
      <div className="relative w-full max-w-xl bg-white border border-slate-100 shadow-2xl p-12 rounded-[48px] animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 text-slate-300 hover:text-slate-900 transition-colors text-xl font-bold"
        >
          ✕
        </button>

        <div className="mb-12">
          <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.4em] mb-4">Step {step} of 2</p>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">
            {step === 1 ? 'Configure Identity' : 'Confirm Launch'}
          </h2>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2 leading-relaxed">
            {step === 1 
              ? 'Define the parameters of your reputation-backed currency.'
              : 'Review your token specifications before biological consensus.'}
          </p>
        </div>

        {step === 1 ? (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <div className="group">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Token Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-blue-400 font-bold text-slate-900 transition-all text-sm"
                />
              </div>
              <div className="group">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Symbol</label>
                <input 
                  type="text" 
                  value={formData.symbol}
                  onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value }))}
                  className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-blue-400 font-bold text-slate-900 transition-all text-sm uppercase"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Description</label>
              <textarea 
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-blue-400 font-medium text-slate-600 transition-all text-sm h-32 resize-none"
              />
            </div>

            <button 
              onClick={() => setStep(2)}
              className="w-full h-16 bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.4em] hover:bg-blue-600 transition-all active:scale-95 shadow-xl shadow-slate-900/10"
            >
              Continue to Review
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-white border border-slate-100 overflow-hidden shadow-inner">
                <img src={formData.image} alt={formData.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">${formData.symbol}</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mr-2">{formData.name}</p>
                <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] mt-2 italic shadow-md inline-block">Powered by Bags & Buildry</p>
              </div>
            </div>

            <div className="space-y-4 pt-4">
               {[
                 { label: 'Blockchain', val: 'Solana (Mainnet)' },
                 { label: 'Fee share (est.)', val: '1% Buildry · 99% creator' },
                 { label: 'Reputation tie', val: 'Verified identity' },
               ].map((item, i) => (
                 <div key={i} className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{item.val}</span>
                 </div>
               ))}
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setStep(1)}
                className="flex-1 h-16 bg-white border border-slate-200 text-slate-300 text-[11px] font-black uppercase tracking-[0.3em] hover:text-slate-900 hover:border-slate-900 transition-all"
              >
                Back
              </button>
              <button 
                onClick={handleLaunch}
                disabled={isLaunching}
                className="flex-3 w-2/3 h-16 bg-blue-600 text-white text-[11px] font-black uppercase tracking-[0.4em] hover:bg-black transition-all active:scale-95 shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 disabled:bg-slate-300 disabled:shadow-none"
              >
                {isLaunching ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Launching...
                  </>
                ) : 'Launch Now'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
