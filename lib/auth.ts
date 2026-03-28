import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { firebaseAuth, firebaseDb, isFirebaseConfigured } from '@/lib/firebaseClient'
import { FS } from '@/lib/firestoreCollections'

export const isSupabaseConfigured = isFirebaseConfigured

export type UserRole = 'developer' | 'founder' | 'investor' | 'recruiter'

export interface AppUser {
  id: string
  email: string | null
  name: string | null
  avatar_url: string | null
  account_type: UserRole | null
  wallet_address: string | null
  created_at: string
}

export async function getSession() {
  if (!firebaseAuth?.currentUser) return null
  return { user: { id: firebaseAuth.currentUser.uid } }
}

export async function getUser(): Promise<AppUser | null> {
  if (!firebaseDb || !firebaseAuth?.currentUser) return null
  const uid = firebaseAuth.currentUser.uid
  const userRef = doc(firebaseDb, FS.USERS, uid)
  const userSnap = await getDoc(userRef)
  if (!userSnap.exists()) return null
  return userSnap.data() as AppUser
}

export async function signUpWithEmail(email: string, password: string) {
  if (!firebaseAuth || !firebaseDb) return { data: null, error: { message: 'Firebase not configured' } }
  try {
    const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password)
    await setDoc(
      doc(firebaseDb, FS.USERS, credential.user.uid),
      {
        id: credential.user.uid,
        email: credential.user.email,
        name: credential.user.displayName || email.split('@')[0],
        avatar_url: credential.user.photoURL,
        account_type: null,
        wallet_address: null,
        created_at: new Date().toISOString(),
      },
      { merge: true }
    )
    return { data: credential, error: null }
  } catch (error: any) {
    return { data: null, error: { message: error?.message || 'Signup failed' } }
  }
}

export async function signInWithEmail(email: string, password: string) {
  if (!firebaseAuth || !firebaseDb) return { data: null, error: { message: 'Firebase not configured' } }
  try {
    const credential = await signInWithEmailAndPassword(firebaseAuth, email, password)
    await setDoc(
      doc(firebaseDb, FS.USERS, credential.user.uid),
      {
        id: credential.user.uid,
        email: credential.user.email,
        name: credential.user.displayName || email.split('@')[0],
        avatar_url: credential.user.photoURL,
        created_at: new Date().toISOString(),
      },
      { merge: true }
    )
    return { data: credential, error: null }
  } catch (error: any) {
    return { data: null, error: { message: error?.message || 'Login failed' } }
  }
}

export async function signInWithGoogle() {
  if (!firebaseAuth || !firebaseDb) return { data: null, error: { message: 'Firebase not configured' } }
  try {
    const provider = new GoogleAuthProvider()
    const credential = await signInWithPopup(firebaseAuth, provider)
    await setDoc(
      doc(firebaseDb, FS.USERS, credential.user.uid),
      {
        id: credential.user.uid,
        email: credential.user.email,
        name: credential.user.displayName || credential.user.email?.split('@')[0] || 'builder',
        avatar_url: credential.user.photoURL,
        created_at: new Date().toISOString(),
      },
      { merge: true }
    )
    return { data: credential, error: null }
  } catch (error: any) {
    return { data: null, error: { message: error?.message || 'Google login failed' } }
  }
}

export async function signOut() {
  if (!firebaseAuth) return { error: null }
  try {
    await firebaseSignOut(firebaseAuth)
    return { error: null }
  } catch (error: any) {
    return { error: { message: error?.message || 'Sign out failed' } }
  }
}

export async function updateUserRole(userId: string, role: UserRole) {
  if (!firebaseDb) return { data: null, error: { message: 'Firebase not configured' } }
  try {
    await updateDoc(doc(firebaseDb, FS.USERS, userId), { account_type: role })
    return { data: true, error: null }
  } catch (error: any) {
    return { data: null, error: { message: error?.message || 'Failed to update role' } }
  }
}

export function createAuthClient() {
  return null
}
