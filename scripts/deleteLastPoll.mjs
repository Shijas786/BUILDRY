/**
 * Deletes the most recent poll post for a Firebase Auth user (email or UID).
 * Usage: node scripts/deleteLastPoll.mjs <email@example.com | uid>
 * Loads FIREBASE_* from .env / .env.local (same pattern as check-firebase-auth-config.mjs).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const ENV_FILE = [path.join(ROOT, '.env.local'), path.join(ROOT, '.env')].find((p) => fs.existsSync(p))

function parseLine(line) {
  line = line.trim()
  if (!line || line.startsWith('#')) return null
  const eq = line.indexOf('=')
  if (eq === -1) return null
  const key = line.slice(0, eq).trim()
  let rest = line.slice(eq + 1).trim()
  if (!key) return null
  let val
  if (rest.startsWith('"') && rest.endsWith('"')) {
    try {
      val = JSON.parse(rest.replace(/\n/g, '\\n'))
    } catch {
      val = rest.slice(1, -1)
    }
  } else {
    val = rest.replace(/^"|"$/g, '')
  }
  return [key, val]
}

function loadEnv() {
  if (!ENV_FILE) {
    console.error('No .env.local or .env found.')
    process.exit(1)
  }
  const raw = fs.readFileSync(ENV_FILE, 'utf8')
  for (const line of raw.split('\n')) {
    const p = parseLine(line)
    if (p) process.env[p[0]] = p[1]
  }
}

loadEnv()

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY')
  process.exit(1)
}

if (getApps().length === 0) {
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  })
}

const auth = getAuth()
const db = getFirestore()

const arg = process.argv[2]
if (!arg) {
  console.error('Usage: node scripts/deleteLastPoll.mjs <email@domain | firebase-uid>')
  process.exit(1)
}

let uid = arg
if (arg.includes('@')) {
  try {
    const u = await auth.getUserByEmail(arg)
    uid = u.uid
  } catch (e) {
    console.error('getUserByEmail failed:', e?.message || e)
    process.exit(1)
  }
}

const postsSnap = await db.collection('posts').where('author_id', '==', uid).get()
const polls = postsSnap.docs
  .map((d) => ({ id: d.id, ...d.data() }))
  .filter((p) => p.post_type === 'poll')
  .sort((a, b) => (b.created_at || 0) - (a.created_at || 0))

if (polls.length === 0) {
  console.error('No poll posts found for this user.')
  process.exit(1)
}

const target = polls[0]
const postId = target.id
console.log('Deleting poll post', postId, 'created_at', target.created_at)

const batchDeletes = []

const comments = await db.collection('post_comments').where('post_id', '==', postId).get()
for (const doc of comments.docs) {
  await doc.ref.delete()
  console.log('  deleted comment', doc.id)
}

const likes = await db.collection('post_likes').where('post_id', '==', postId).get()
for (const doc of likes.docs) {
  await doc.ref.delete()
  console.log('  deleted like', doc.id)
}

const notifs = await db.collection('notifications').where('post_id', '==', postId).get()
for (const doc of notifs.docs) {
  await doc.ref.delete()
  console.log('  deleted notification', doc.id)
}

await db.collection('posts').doc(postId).delete()
console.log('Done. Removed poll post', postId)
