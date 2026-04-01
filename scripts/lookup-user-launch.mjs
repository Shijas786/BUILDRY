/**
 * One-off: find builder by username and print user_token_launches + profile launch fields.
 * Usage: node scripts/lookup-user-launch.mjs shijas
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
  const text = fs.readFileSync(ENV_FILE, 'utf8')
  for (const line of text.split('\n')) {
    const p = parseLine(line)
    if (p) process.env[p[0]] = p[1]
  }
}

const handle = (process.argv[2] || '').trim().toLowerCase().replace(/^@/, '')
if (!handle) {
  console.error('Usage: node scripts/lookup-user-launch.mjs <username>')
  process.exit(1)
}

loadEnv()

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_PRIVATE_KEY

if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY')
  process.exit(1)
}

if (getApps().length === 0) {
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  })
}

const db = getFirestore()

const snap = await db
  .collection('builder_profiles')
  .where('username', '==', handle)
  .limit(5)
  .get()

if (snap.empty) {
  console.log(JSON.stringify({ found: false, username: handle, message: 'No builder_profiles row with this username' }, null, 2))
  process.exit(0)
}

const out = []
for (const doc of snap.docs) {
  const uid = doc.id
  const data = doc.data()
  const reg = await db.collection('user_token_launches').doc(uid).get()
  const regData = reg.exists ? reg.data() : null
  out.push({
    uid,
    username: data.username,
    displayName: data.name,
    has_launched_token: data.has_launched_token === true,
    profile: {
      last_launch_mint: data.last_launch_mint || null,
      last_launch_symbol: data.last_launch_symbol || null,
      bags_primary_mint: data.bags_primary_mint || null,
    },
    user_token_launches_doc: regData
      ? {
          mint: regData.mint,
          symbol: regData.symbol,
          name: regData.name,
          launched_at: regData.launched_at,
        }
      : null,
  })
}

console.log(JSON.stringify({ found: true, username: handle, builders: out }, null, 2))
