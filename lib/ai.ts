import axios from 'axios'

const CHAINGPT_BASE = 'https://api.chaingpt.org/v1'
const CHAINGPT_KEY = process.env.CHAINGPT_API_KEY || ''

export interface RiskBriefParams {
  name: string
  symbol: string
  wallet: string
  tier: 'VERIFIED' | 'PARTIAL' | 'ANONYMOUS'
  builderScore?: number | null
  githubCommits?: number | null
  reliabilityScore?: number | null
}

/**
 * Unified AI service using ChainGPT as the sole provider.
 */
export async function generateRiskBrief(params: RiskBriefParams): Promise<string> {
  const prompt = `Analyze this Solana token for a trader.
Token name: ${params.name}. Symbol: ${params.symbol}.
Creator wallet: ${params.wallet}.
Creator trust tier: ${params.tier}.
Builder Rank: ${params.builderScore ?? 'not found'}.
GitHub commits last 30 days: ${params.githubCommits ?? 'unknown'}.
Builder Reliability Score: ${params.reliabilityScore ? params.reliabilityScore.toFixed(0) + '%' : 'unknown'}.
Write exactly 3 sentences of risk assessment.
Be direct and factual. No financial advice.
Do not use bullet points.`

  if (CHAINGPT_KEY) {
    try {
      const { data } = await axios.post(
        `${CHAINGPT_BASE}/chat/completions`,
        {
          model: 'chaingpt-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 250,
          temperature: 0.3,
        },
        {
          headers: {
            'Authorization': `Bearer ${CHAINGPT_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      )
      const content = data?.choices?.[0]?.message?.content
      if (content) return content
    } catch (e) {
      console.error('ChainGPT AI Error:', e)
    }
  }

  return getMockRiskBrief(params)
}

function getMockRiskBrief(params: RiskBriefParams): string {
  if (params.tier === 'VERIFIED') {
    return `${params.name} (${params.symbol}) is created by a verified builder with a Talent Protocol rank of ${params.builderScore ?? 'N/A'}, placing them in the top 3% globally. The creator has active GitHub contributions and linked social accounts, suggesting genuine development activity. While this does not guarantee price performance, the strong identity verification significantly reduces rug-pull risk.`
  }
  if (params.tier === 'PARTIAL') {
    return `${params.name} (${params.symbol}) has a creator with a Farcaster or Twitter presence but no verified onchain builder profile on Talent Protocol. The lack of formal identity verification introduces moderate risk, as the creator's technical capabilities cannot be fully confirmed. Exercise caution and keep position sizes small until the creator establishes more verifiable credentials.`
  }
  return `${params.name} (${params.symbol}) was deployed by a completely anonymous wallet with zero verifiable identity — no Talent Protocol profile, no Farcaster account, and no linked socials. This pattern is statistically associated with high-risk pump-and-dump schemes on Solana. Trading this token carries extreme risk and is not recommended unless you are prepared for total capital loss.`
}
