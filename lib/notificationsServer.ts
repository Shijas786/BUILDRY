import type { Firestore } from 'firebase-admin/firestore'
import { FS } from '@/lib/firestoreCollections'

export type SocialNotificationType = 'post_like' | 'post_repost' | 'post_comment' | 'follow'

/**
 * In-app notification for the recipient (`user_id` matches existing Firestore index).
 */
export async function notifySocial(
  db: Firestore,
  input: {
    recipientUserId: string
    actorUserId: string
    type: SocialNotificationType
    postId?: string | null
    commentId?: string | null
    commentPreview?: string | null
  }
): Promise<void> {
  const r = input.recipientUserId?.trim()
  const a = input.actorUserId?.trim()
  if (!r || !a || r === a) return
  try {
    await db.collection(FS.NOTIFICATIONS).add({
      user_id: r,
      actor_id: a,
      type: input.type,
      read: false,
      created_at: Date.now(),
      post_id: input.postId ?? null,
      comment_id: input.commentId ?? null,
      comment_preview: input.commentPreview ? String(input.commentPreview).slice(0, 240) : null,
    })
  } catch (e) {
    console.error('notifySocial:', e)
  }
}
