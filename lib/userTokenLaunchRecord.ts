import type { Firestore } from 'firebase-admin/firestore'
import { FS } from '@/lib/firestoreCollections'

/** One doc per user: `user_token_launches/{firebaseUid}` */
export type UserTokenLaunchDoc = {
  user_id: string
  mint: string
  name: string
  symbol: string
  launched_at: number
}

export async function writeUserTokenLaunch(
  db: Firestore,
  userId: string,
  params: { mint: string; name: string; symbol: string; launchedAt?: number }
): Promise<void> {
  const uid = userId.trim()
  const mint = params.mint.trim()
  if (!uid || !mint) return
  const sym = params.symbol.trim().toUpperCase() || 'TOKEN'
  const name = (params.name.trim() || sym).slice(0, 200)
  const launched_at = typeof params.launchedAt === 'number' ? params.launchedAt : Date.now()
  const payload: UserTokenLaunchDoc = {
    user_id: uid,
    mint,
    name,
    symbol: sym,
    launched_at,
  }
  await db.collection(FS.USER_TOKEN_LAUNCHES).doc(uid).set(payload, { merge: true })
}

export async function readUserTokenLaunch(
  db: Firestore,
  userId: string
): Promise<{ mint: string; name: string; symbol: string; created_at: number } | null> {
  const uid = userId.trim()
  if (!uid) return null
  const snap = await db.collection(FS.USER_TOKEN_LAUNCHES).doc(uid).get()
  const d = snap.data() as UserTokenLaunchDoc | undefined
  if (!d) return null
  const mint = typeof d.mint === 'string' ? d.mint.trim() : ''
  if (!mint) return null
  const symbol = (typeof d.symbol === 'string' ? d.symbol : 'TOKEN').trim().toUpperCase() || 'TOKEN'
  const name = (typeof d.name === 'string' ? d.name.trim() : '') || symbol
  const created_at =
    typeof d.launched_at === 'number' && Number.isFinite(d.launched_at) ? d.launched_at : Date.now()
  return { mint, name, symbol, created_at }
}

/** Resolve a mint to the Buildry user who registered it (doc id = Firebase uid). */
export async function readUserTokenLaunchByMint(
  db: Firestore,
  mint: string
): Promise<{ uid: string; mint: string; name: string; symbol: string; launched_at: number } | null> {
  const m = mint.trim()
  if (!m) return null
  const snap = await db.collection(FS.USER_TOKEN_LAUNCHES).where('mint', '==', m).limit(1).get()
  if (snap.empty) return null
  const doc = snap.docs[0]
  const d = doc.data() as UserTokenLaunchDoc | undefined
  if (!d) return null
  const mintOut = typeof d.mint === 'string' ? d.mint.trim() : ''
  if (!mintOut) return null
  const symbol = (typeof d.symbol === 'string' ? d.symbol : 'TOKEN').trim().toUpperCase() || 'TOKEN'
  const name = (typeof d.name === 'string' ? d.name.trim() : '') || symbol
  const launched_at =
    typeof d.launched_at === 'number' && Number.isFinite(d.launched_at) ? d.launched_at : Date.now()
  return { uid: doc.id, mint: mintOut, name, symbol, launched_at }
}
