import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white px-6 py-16 text-slate-800">
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Terms of Service</h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          Full legal terms for Buildry and token launches are being finalized. Token launches may also be subject to third-party
          platform rules (for example Bags.fm). Contact your team if you need a signed agreement before going live.
        </p>
        <Link href="/launch" className="mt-8 inline-block text-sm font-bold text-blue-600 hover:underline">
          ← Back to launch
        </Link>
      </div>
    </div>
  )
}
