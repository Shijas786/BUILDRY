/**
 * Reads Firebase Auth remote config (authorized domains, sign-in providers) via
 * Identity Toolkit v2 API. Uses FIREBASE_* from .env / .env.local — does not print secrets.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { GoogleAuth } from 'google-auth-library'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const ENV_FILE = [path.join(ROOT, '.env.local'), path.join(ROOT, '.env')].find((p) =>
  fs.existsSync(p)
)

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
  const text = fs.readFileSync(ENV_FILE, 'utf8')
  for (const line of text.split('\n')) {
    const p = parseLine(line)
    if (p) process.env[p[0]] = p[1]
  }
  console.error(`Using env file: ${path.basename(ENV_FILE)}`)
}

loadEnv()

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY.')
  process.exit(1)
}

const REQUIRED_DOMAINS = ['localhost', 'buildry.in', 'www.buildry.in']

async function main() {
  const auth = new GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  })
  const client = await auth.getClient()
  const { token } = await client.getAccessToken()
  if (!token) {
    console.error('Could not obtain access token (check service account roles).')
    process.exit(1)
  }

  const url = `https://identitytoolkit.googleapis.com/v2/projects/${projectId}/config`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const bodyText = await res.text()
  if (!res.ok) {
    console.error(`API ${res.status}: ${bodyText.slice(0, 500)}`)
    process.exit(1)
  }

  const config = JSON.parse(bodyText)
  const domains = config.authorizedDomains || []

  console.log('\n=== Firebase Auth config (remote) ===')
  console.log(`Project: ${projectId}`)
  console.log('\nAuthorized domains:')
  for (const d of domains) console.log(`  - ${d}`)

  const missing = REQUIRED_DOMAINS.filter((d) => !domains.includes(d))
  if (missing.length) {
    console.log('\n⚠ Missing recommended domains:', missing.join(', '))
  } else {
    console.log('\n✓ Required domains present: localhost, buildry.in, www.buildry.in')
  }

  // Default supported IdPs (Google, Apple, etc.) — not in projects.getConfig.signIn
  const idpUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/defaultSupportedIdpConfigs`
  const idpRes = await fetch(idpUrl, { headers: { Authorization: `Bearer ${token}` } })
  const idpText = await idpRes.text()
  console.log('\nSign-in (default supported IdPs):')
  if (!idpRes.ok) {
    console.log(`  ⚠ Could not list IdPs (${idpRes.status}). ${idpText.slice(0, 200)}`)
  } else {
    const idpJson = JSON.parse(idpText)
    const list = idpJson.defaultSupportedIdpConfigs || []
    if (!list.length) {
      console.log('  (none returned — check Console → Authentication → Sign-in method)')
    }
    for (const c of list) {
      const id = c.name?.split('/').pop() || c.name
      const enabled = c.enabled !== false
      console.log(`  ${enabled ? '✓' : '○'} ${id}${enabled ? '' : ' (disabled)'}`)
    }
    const google = list.find((c) => String(c.name || '').endsWith('/google.com'))
    if (google && google.enabled !== false) {
      console.log('\n✓ Google sign-in is enabled.')
    } else if (list.length) {
      console.log('\n⚠ Google (google.com) not found or disabled in default IdP list.')
    }
  }

  const oauthUrl = `https://identitytoolkit.googleapis.com/v2/projects/${projectId}/oauthIdpConfigs`
  const oauthRes = await fetch(oauthUrl, { headers: { Authorization: `Bearer ${token}` } })
  const oauthText = await oauthRes.text()
  console.log('\nCustom OAuth / OIDC providers (oauthIdpConfigs):')
  if (!oauthRes.ok) {
    console.log(`  (skip: ${oauthRes.status})`)
  } else {
    const oj = JSON.parse(oauthText)
    const cfgs = oj.oauthIdpConfigs || []
    if (!cfgs.length) console.log('  (none)')
    for (const c of cfgs) {
      const id = c.name?.split('/').pop() || c.name
      console.log(`  - ${id} (enabled: ${c.enabled !== false})`)
    }
  }

  console.log('\n=== Client env (local file only) ===')
  const pub = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
  ]
  for (const k of pub) {
    console.log(`  ${k}: ${process.env[k] ? 'set' : 'MISSING'}`)
  }

  const authDomain =
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`
  const initUrl = `https://${authDomain.replace(/^https?:\/\//, '')}/__/firebase/init.json`
  console.log('\nAuth helper config URL (should be HTTP 200 after Hosting deploy):')
  console.log(`  ${initUrl}`)
  try {
    const initRes = await fetch(initUrl, { method: 'HEAD', redirect: 'follow' })
    if (initRes.ok) {
      console.log(`  ✓ ${initRes.status} — GitHub/redirect OAuth helper can load config.`)
    } else {
      console.log(
        `  ⚠ ${initRes.status} — run \`npm run firebase:deploy:hosting\` so __/firebase/init.json is served (see README § Firebase Hosting).`
      )
    }
  } catch (e) {
    console.log(`  ⚠ Could not reach init.json (${e.message}).`)
  }

  console.log('\nNote: Vercel/production env is not checked by this script.\n')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
