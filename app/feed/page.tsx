import { loadHydratedPosts } from '@/lib/loadHydratedPosts'
import FeedPageClient from '@/components/FeedPageClient'

/** ISR-style freshness: balances TTFB with not hammering Firestore on every navigation. */
export const revalidate = 30

export default async function FeedPage() {
  const initialPosts = await loadHydratedPosts({ page: 1, limit: 20 })

  return <FeedPageClient initialPosts={initialPosts} />
}
