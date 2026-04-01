/**
 * Link a mint to a builder on Firestore (registry + profile). Use when launch was on-chain
 * but Buildry never saved (e.g. local env mismatch, failed server action).
 *
 * Usage:
 *   node scripts/backfill-user-token-launch.mjs <username|uid> <mint> [name] [symbol]
 *
 * Example:
 *   node scripts/backfill-user-token-launch.mjs shijas 62jAkcuw2UW2wEQ5vwgXf24uKKknqZE1oJSZZerqBAGS "shijas" SHIJAS
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
  } else {
    val = rest.replace(/^"|"$/g, '')
  }
  if (key === 'FIREBASE_PRIVATE_KEY' && typeof val === 'string') {
    val = val.replace(/\\n/g, '\n')
  }
  return [key, val]
}

function loadEnv() {
  if (!ENV_FILE) {
    console.error('No .env.local or .env found.')
    process.exit(1)
  }
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const p = parseLine(line)
    if (p) process.env[p[0]] = p[1]
  }
}

const arg1 = (process.argv[2] || '').trim()
const mint = (process.argv[3] || '').trim()
let name = (process.argv[4] || '').trim()
let symbol = (process.argv[5] || '').trim().toUpperCase()

if (!arg1 || !mint) {
  console.error('Usage: node scripts/backfill-user-token-launch.mjs <username|uid> <mint> [name] [symbol]')
  process.exit(1)
}

loadEnv()

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_PRIVATE_KEY
if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing Firebase admin env')
  process.exit(1)
}

if (getApps().length === 0) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
}
const db = getFirestore()

let uid = arg1
if (!/^[a-zA-Z0-9]{20,}$/.test(arg1)) {
  const handle = arg1.toLowerCase().replace(/^@/, '')
  const snap = await db.collection('builder_profiles').where('username', '==', handle).limit(1).get()
  if (snap.empty) {
    console.error(`No builder_profiles with username "${handle}"`)
    process.exit(1)
  }
  uid = snap.docs[0].id
  console.error(`Resolved @${handle} -> uid ${uid}`)
}

if (!name) name = 'Token'
if (!symbol) symbol = 'TKN'

const now = Date.now()

await db
  .collection('user_token_launches')
  .doc(uid)
  .set({ user_id: uid, mint, name: name.slice(0, 200), symbol, launched_at: now }, { merge: true })

await db
  .collection('builder_profiles')
  .doc(uid)
  .set(
    {
      has_launched_token: true,
      bags_primary_mint: mint,
      last_launch_mint: mint,
      last_launch_name: name.slice(0, 200),
      last_launch_symbol: symbol,
      last_launch_at: now,
    },
    { merge: true }
  )

console.log(JSON.stringify({ ok: true, uid, mint, name, symbol, launched_at: now }, null, 2))
