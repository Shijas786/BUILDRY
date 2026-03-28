import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const ENV_FILE = [path.join(ROOT, '.env.local'), path.join(ROOT, '.env')].find((p) =>
  fs.existsSync(p)
)
if (!ENV_FILE) {
  console.error('No .env.local or .env found in project root.')
  process.exit(1)
}
console.error(`Using env file: ${path.basename(ENV_FILE)}`)

function parseLine(line) {
  line = line.trim()
  if (!line || line.startsWith('#')) return null
  const eq = line.indexOf('=')
  if (eq === -1) return null
  const key = line.slice(0, eq).trim()
  let rest = line.slice(eq + 1).trim()
  if (!key || key.startsWith('VERCEL_')) return null
  let val
  if (rest.startsWith('"') && rest.endsWith('"')) {
    val = JSON.parse(rest.replace(/\n/g, '\\n'))
  } else {
    val = rest.replace(/^"|"$/g, '')
  }
  return [key, val]
}

const text = fs.readFileSync(ENV_FILE, 'utf8')
const pairs = []
for (const line of text.split('\n')) {
  const p = parseLine(line)
  if (!p) continue
  if (/SUPABASE/i.test(p[0])) continue
  pairs.push(p)
}

const sensitive = (k) =>
  /KEY|SECRET|TOKEN|PRIVATE|PASSWORD|ANON/i.test(k)

function add(key, val, target) {
  console.error(`${key} -> ${target}`)
  const hasNewline = val.includes('\n')
  if (hasNewline) {
    const args = ['vercel', 'env', 'add', key, target, '--yes', '--force']
    if (sensitive(key)) args.splice(5, 0, '--sensitive')
    const r = spawnSync('npx', args, {
      cwd: ROOT,
      input: val,
      encoding: 'utf8',
      stdio: ['pipe', 'inherit', 'inherit'],
    })
    if (r.status !== 0) throw new Error(`vercel env add ${key} failed: ${r.status}`)
    return
  }
  const args = ['vercel', 'env', 'add', key, target, '--yes', '--force', '--value', val]
  if (sensitive(key)) args.splice(6, 0, '--sensitive')
  execFileSync('npx', args, { cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit'] })
}

// Preview env vars require a connected Git repo on Vercel; use production only until Git is linked.
for (const target of ['production']) {
  for (const [key, val] of pairs) {
    add(key, val, target)
  }
}
