'use client'

import React, { useState } from 'react'
import Link from 'next/link'

export default function LaunchStudio() {
  const [loading, setLoading] = useState(false)
  const [deployed, setDeployed] = useState(false)
  const [contractAddress, setContractAddress] = useState('')

  // Form State
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [description, setDescription] = useState('')

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const res = await fetch('/api/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          symbol,
          description,
          builderTwitter: 'nicocarvalho', // Demo linked social (replace with real user)
          walletAddress: 'Wallet123'
        })
      })

      const data = await res.json()
      if (data.success) {
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
      <header className="h-16 border-b border-gray-200 flex items-center px-6 bg-white sticky top-0 z-50">
        <Link href="/" className="font-black text-lg tracking-tight hover:opacity-80">Buildry</Link>
        <div className="mx-4 text-gray-300">/</div>
        <div className="text-gray-900 font-semibold">Builder Studio</div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        {deployed ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-2xl animate-in zoom-in duration-500">
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h1 className="text-4xl font-black mb-4">Token Deployed!</h1>
            <p className="text-gray-500 text-lg mb-8">Your project is live on Bags. Fee routing follows your launch configuration.</p>
            <div className="bg-gray-50 p-4 rounded-xl font-mono text-sm text-gray-500 mb-8 break-all max-w-lg mx-auto border border-gray-200">
              Contract: {contractAddress}
            </div>
            <Link href="/" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-10 rounded-xl transition-all shadow-lg hover:shadow-xl text-lg">
              Return to Discovery Hub
            </Link>
          </div>
        ) : (
          <div>
            <div className="mb-10 text-center">
              <h1 className="text-4xl font-black tracking-tight mb-4">Launch Your Project</h1>
              <p className="text-gray-500 text-lg">
                Deploy your token through the Bags API. Context from your Buildry profile and linked GitHub can surface on your launch, and trading fees are routed per your Bags fee settings (often mostly to liquidity).
              </p>
            </div>

            <form onSubmit={handleDeploy} className="bg-white rounded-3xl p-8 md:p-12 border border-gray-100 shadow-xl relative overflow-hidden">
              <div className="space-y-6 relative z-10">
                
                {/* Linked profile hint */}
                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-center gap-4 mb-8">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">✓</div>
                  <div>
                    <div className="font-bold text-gray-900">Wallet linked to your Buildry profile</div>
                    <div className="text-sm text-gray-500">
                      Builder score, commits, and linked accounts from Settings can show on your token page.
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Project Name</label>
                    <input required type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. NextGen Protocol" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all font-medium text-lg text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Token Symbol</label>
                    <input required type="text" value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="e.g. NGP" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all font-medium text-lg text-gray-900 uppercase" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Vision & Roadmap</label>
                  <textarea required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what you're building..." className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all font-medium text-gray-900 resize-none"></textarea>
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-black text-lg py-5 rounded-xl transition-all shadow-[0_4px_14px_rgba(37,99,235,0.4)] flex items-center justify-center gap-3">
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Deploying via Bags API...
                      </>
                    ) : (
                      'Initialize Deployment'
                    )}
                  </button>
                  <div className="text-center mt-4">
                    <span className="text-xs font-semibold tracking-wider uppercase text-gray-400">100% Fees go to Liquidity Pool & Backers</span>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
