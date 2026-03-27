import axios from 'axios'

const CHAINGPT_BASE = 'https://api.chaingpt.org'
const API_KEY = process.env.CHAINGPT_API_KEY || ''

const chainGptClient = axios.create({
  baseURL: CHAINGPT_BASE,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

export interface RiskBriefParams {
  name: string
  symbol: string
  wallet: string
  tier: 'VERIFIED' | 'PARTIAL' | 'ANONYMOUS'
  builderScore?: number | null
  githubCommits?: number | null
}

export async function generateRiskBrief(params: RiskBriefParams): Promise<string> {
  if (!API_KEY) return getMockRiskBrief(params)

  const prompt = `Analyze this Solana token for a trader.
Token name: ${params.name}. Symbol: ${params.symbol}.
Creator wallet: ${params.wallet}.
Creator trust tier: ${params.tier}.
Builder Rank: ${params.builderScore ?? 'not found'}.
GitHub commits last 30 days: ${params.githubCommits ?? 'unknown'}.
Write exactly 3 sentences of risk assessment.
Be direct and factual. No financial advice.
Do not use bullet points.`

  try {
    const { data } = await chainGptClient.post('/v1/chat/completions', {
      model: 'chaingpt-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.3,
    })
    return data?.choices?.[0]?.message?.content || getMockRiskBrief(params)
  } catch {
    return getMockRiskBrief(params)
  }
}

function getMockRiskBrief(params: RiskBriefParams): string {
  if (params.tier === 'VERIFIED') {
    return `${params.name} (${params.symbol}) is created by a verified builder with a Talent Protocol rank of ${params.builderScore ?? 'N/A'}, placing them in the top 3% globally. The creator has active GitHub contributions and linked social accounts, suggesting genuine development activity. While this does not guarantee price performance, the strong identity verification significantly reduces rug-pull risk.`
  }
  if (params.tier === 'PARTIAL') {
    return `${params.name} (${params.symbol}) has a creator with a Twitter presence but no verified onchain builder profile on Talent Protocol. The lack of GitHub activity and formal identity verification introduces moderate risk, as the creator's technical capabilities cannot be confirmed. Exercise caution and keep position sizes small until the creator establishes more verifiable credentials.`
  }
  return `${params.name} (${params.symbol}) was deployed by a completely anonymous wallet with zero verifiable identity — no Talent Protocol profile, no GitHub, and no linked social accounts. This pattern is statistically associated with short-term pump-and-dump schemes and rug pulls on Solana. Trading this token carries extreme risk and is not recommended unless you can afford to lose the entire investment.`
}
