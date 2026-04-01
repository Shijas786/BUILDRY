/**
 * Delete the newest post whose content includes a substring (case-insensitive).
 * Usage: node scripts/deletePostByContent.mjs "Firestore live check"
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
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
  } else val = rest.replace(/^"|"$/g, '')
  return [key, val]
}

if (!ENV_FILE) {
  console.error('No .env')
  process.exit(1)
}
for (const line of fs.readFileSync(ENV_FILE, 'utf8').split('\n')) {
  const p = parseLine(line)
  if (p) process.env[p[0]] = p[1]
}

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
if (getApps().length === 0) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
}

const db = getFirestore()
const needle = (process.argv[2] || '').trim()
if (!needle) {
  console.error('Usage: node scripts/deletePostByContent.mjs "substring"')
  process.exit(1)
}
const lower = needle.toLowerCase()

const snap = await db.collection('posts').orderBy('created_at', 'desc').limit(500).get()
const hits = snap.docs
  .map((d) => ({ id: d.id, ...d.data() }))
  .filter((p) => String(p.content || '').toLowerCase().includes(lower))

if (hits.length === 0) {
  console.error('No post found containing:', needle)
  process.exit(1)
}

const target = hits[0]
const postId = target.id
console.log('Deleting', postId, 'type=', target.post_type, 'content=', JSON.stringify(String(target.content).slice(0, 80)))

for (const doc of (await db.collection('post_comments').where('post_id', '==', postId).get()).docs) {
  await doc.ref.delete()
}
for (const doc of (await db.collection('post_likes').where('post_id', '==', postId).get()).docs) {
  await doc.ref.delete()
}
for (const doc of (await db.collection('notifications').where('post_id', '==', postId).get()).docs) {
  await doc.ref.delete()
}
await db.collection('posts').doc(postId).delete()
console.log('Done.')
