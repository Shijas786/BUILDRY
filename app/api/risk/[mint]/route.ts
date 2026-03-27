import { NextRequest, NextResponse } from 'next/server'
import { generateRiskBrief } from '@/lib/ai'

export async function GET(
  req: NextRequest,
  { params }: { params: { mint: string } }
) {
  const { mint } = params
  const name = req.nextUrl.searchParams.get('name') || 'Unknown'
  const symbol = req.nextUrl.searchParams.get('symbol') || 'UNK'
  const wallet = req.nextUrl.searchParams.get('wallet') || ''
  const tier = (req.nextUrl.searchParams.get('tier') || 'ANONYMOUS') as 'VERIFIED' | 'PARTIAL' | 'ANONYMOUS'
  const builderScore = req.nextUrl.searchParams.get('builderScore')
  const githubCommits = req.nextUrl.searchParams.get('githubCommits')
  const reliabilityScore = req.nextUrl.searchParams.get('reliabilityScore')

  const brief = await generateRiskBrief({
    name,
    symbol,
    wallet,
    tier,
    builderScore: builderScore ? Number(builderScore) : null,
    githubCommits: githubCommits ? Number(githubCommits) : null,
    reliabilityScore: reliabilityScore ? Number(reliabilityScore) : null,
  })

  return NextResponse.json({ brief, mint }, {
    headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=600' },
  })
}
