import axios from 'axios'

const TALENT_BASE = 'https://api.talentprotocol.com/v1'
const API_KEY = process.env.TALENT_API_KEY || ''

const talentClient = axios.create({
  baseURL: TALENT_BASE,
  headers: { 'X-API-KEY': API_KEY },
  timeout: 10000,
})

export interface TalentProfile {
  id: string
  name: string
  username: string
  avatar?: string
  bio?: string
  location?: string
  githubScore?: number
  previousProjects?: string[]
  score?: number
  verified?: boolean
}

export interface TalentScore {
  score: number
  rank: number
  percentile: number
}

export async function getProfile(identifier: string): Promise<TalentProfile | null> {
  if (!API_KEY) return null
  try {
    const { data } = await talentClient.get(`/profiles/${identifier}`)
    const p = data?.profile || data
    return {
      id: p.id,
      name: p.name || p.display_name || p.username || 'Builder',
      username: p.username || 'builder',
      avatar: p.profile_picture_url || p.image_url,
      bio: p.bio,
      score: p.score || 0,
      verified: !!p.score && p.score > 20,
    }
  } catch (err: any) {
    if (err.response?.status === 404) return null
    console.error('Talent getProfile failed:', err.message)
    return null
  }
}

export async function getTopProfiles(limit: number = 8): Promise<TalentProfile[]> {
  if (!API_KEY) return []
  
  try {
    // Current Talent API uses /profiles with sorting or discovery parameters
    const res = await talentClient.get('/profiles', {
      params: { page_size: limit, sort: 'score' }
    })
    
    const profiles = res.data?.profiles || []
    return profiles.map((p: any) => ({
      id: p.id,
      name: p.name || p.display_name || p.username || 'Builder',
      username: p.username || 'builder',
      avatar: p.profile_picture_url || p.image_url,
      score: p.score || 0,
      verified: true,
    }))
  } catch (err: any) {
    console.error('Talent getTopProfiles failed:', err.message)
    return []
  }
}
