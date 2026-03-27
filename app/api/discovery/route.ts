import { NextRequest, NextResponse } from 'next/server'
import { getTrendingTokens, BagsToken } from '@/lib/bags'
import { getProfile } from '@/lib/talent'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const query = searchParams.get('query')?.toLowerCase() || ''
    const role = searchParams.get('role')?.toLowerCase() || ''

    // 1. Fetch trending tokens from Bags
    const allTokens = await getTrendingTokens()

    // 2. Filter out product tokens and noise
    const filteredTokens = allTokens.filter(t => {
      const name = t.name.toLowerCase()
      const symbol = t.symbol.toLowerCase()
      return !name.includes('bags') && symbol !== 'bags'
    })

    // 3. Enrich with Talent Reputation & Skills
    const discoveryFeed = await Promise.all(
      filteredTokens.slice(0, 30).map(async (token) => {
        if (!token.creatorWallet) return null

        try {
          const profile = await getProfile(token.creatorWallet)
          if (!profile) return null

          // Derive Role from Bio/Username/Description
          const bio = (profile.bio || '').toLowerCase()
          let builderRole = 'Fullstack'
          if (bio.includes('ui') || bio.includes('design') || bio.includes('frontend')) builderRole = 'UI/UX Designer'
          else if (bio.includes('backend') || bio.includes('protocol') || bio.includes('node')) builderRole = 'Backend Architect'
          else if (bio.includes('solana') || bio.includes('rust') || bio.includes('anchor')) builderRole = 'Solana Specialist'

          // Extract Skill Tags
          const skills = []
          if (bio.includes('react')) skills.push('React')
          if (bio.includes('rust') || bio.includes('solana')) skills.push('Rust')
          if (bio.includes('design') || bio.includes('figma')) skills.push('Figma')
          if (bio.includes('solidity')) skills.push('Solidity')
          if (skills.length === 0) skills.push('Base', 'Solana')

          return {
            ...token,
            builderName: profile.name,
            builderUsername: profile.username,
            avatar: profile.avatar || token.imageUrl,
            score: profile.score || 0,
            verified: profile.verified,
            role: builderRole,
            skills: skills.slice(0, 3),
            location: profile.location || 'Remote',
          }
        } catch {
          return null
        }
      })
    )

    // Filter out nulls first
    let finalFeed = discoveryFeed.filter((item): item is NonNullable<typeof item> => item !== null)
    
    // 4. Fallback Mock Data if API results are empty (for dev/demo)
    if (finalFeed.length < 3) {
      const mockBuilders = [
        {
          mint: 'mock-1',
          name: 'Buildry Pro',
          symbol: 'REPU',
          imageUrl: 'https://avatar.vercel.sh/repu',
          builderName: 'Alex Rivera',
          builderUsername: 'arivera',
          avatar: 'https://unavatar.io/twitter/arivera',
          score: 9.8,
          verified: true,
          role: 'UI/UX Designer',
          skills: ['Figma', 'React', 'Tailwind'],
          location: 'San Francisco, CA',
          price: 0.12,
          priceChange24h: 0,
          marketCap: 0,
          volume24h: 0,
          holders: 420,
        },
        {
          mint: 'mock-2',
          name: 'Protocol Engine',
          symbol: 'ENGINE',
          imageUrl: 'https://avatar.vercel.sh/engine',
          builderName: 'Sarah Chen',
          builderUsername: 'schen_dev',
          avatar: 'https://unavatar.io/twitter/schen_dev',
          score: 9.5,
          verified: true,
          role: 'Backend Architect',
          skills: ['Rust', 'Node.js', 'Solidity'],
          location: 'London, UK',
          price: 0.08,
          priceChange24h: 0,
          marketCap: 0,
          volume24h: 0,
          holders: 315,
        },
        {
          mint: 'mock-3',
          name: 'Solana Bridge',
          symbol: 'BRIDGE',
          imageUrl: 'https://avatar.vercel.sh/bridge',
          builderName: 'Michael Vance',
          builderUsername: 'vance_crypto',
          avatar: 'https://unavatar.io/twitter/vance_crypto',
          score: 9.2,
          verified: true,
          role: 'Solana Specialist',
          skills: ['Anchor', 'Rust', 'Web3.js'],
          location: 'Austin, TX',
          price: 0.04,
          priceChange24h: 0,
          marketCap: 0,
          volume24h: 0,
          holders: 198,
        }
      ]
      finalFeed = [...finalFeed, ...mockBuilders]
    }

    // Apply Search/Role filters on the final set
    if (query) {
      finalFeed = finalFeed.filter(item => 
        item.builderName.toLowerCase().includes(query) || 
        item.builderUsername.toLowerCase().includes(query) ||
        item.name.toLowerCase().includes(query)
      )
    }

    if (role && role !== 'all') {
      finalFeed = finalFeed.filter(item => item.role.toLowerCase().includes(role))
    }

    // Sort by REPU Score
    const sortedFeed = finalFeed.sort((a, b) => (b.score || 0) - (a.score || 0))

    return NextResponse.json(sortedFeed, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' },
    })
  } catch (err) {
    console.error('Discovery API Error:', err)
    return NextResponse.json({ error: 'Failed to fetch discovery feed' }, { status: 500 })
  }
}
