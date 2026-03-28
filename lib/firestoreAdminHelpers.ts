import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'
import { FS } from '@/lib/firestoreCollections'
import type { Firestore } from 'firebase-admin/firestore'

export async function mergeBuilderProfileFields(userId: string, patch: Record<string, unknown>) {
  if (!isFirebaseAdminConfigured || !adminDb) {
    throw new Error('Firebase Admin is not configured.')
  }
  await adminDb.collection(FS.BUILDER_PROFILES).doc(userId).set(
    {
      ...patch,
      user_id: userId,
      id: userId,
      updated_at: Date.now(),
    },
    { merge: true }
  )
}

export async function fetchUserMini(db: Firestore, uid: string) {
  const snap = await db.collection(FS.USERS).doc(uid).get()
  if (!snap.exists) return null
  const d = snap.data()!
  return {
    id: uid,
    name: (d.name as string) || 'Builder',
    avatar_url: (d.avatar_url as string | undefined) ?? null,
    account_type: (d.account_type as string | undefined) ?? null,
  }
}

export async function fetchProjectMini(db: Firestore, projectId: string) {
  const snap = await db.collection(FS.PROJECTS).doc(projectId).get()
  if (!snap.exists) return null
  const d = snap.data()!
  return {
    title: (d.title as string) || '',
    category: (d.category as string | undefined) ?? null,
  }
}
