import { randomBytes } from 'crypto'
import nacl from 'tweetnacl'
import { PublicKey } from '@solana/web3.js'
import { verifyMessage } from 'viem'
import type { Firestore } from 'firebase-admin/firestore'
import { claimDocId, normalizeEvmWallet, normalizeSolWallet } from '@/lib/walletNormalize'
import { MAX_VERIFIED_WALLETS } from '@/lib/walletConstants'
import { FS } from '@/lib/firestoreCollections'

const CHALLENGE_COL = FS.WALLET_LINK_CHALLENGES
const CLAIMS = FS.WALLET_ADDRESS_CLAIMS
const TTL_MS = 10 * 60 * 1000

export type VerifiedWalletEntry = { chain: 'sol' | 'evm'; address: string; verified_at: number }

export function buildLinkMessage(params: {
  uid: string
  chain: string
  address: string
  nonce: string
  expiresAt: number
}): string {
  return `Buildry — link wallet to your account
Firebase UID: ${params.uid}
Chain: ${params.chain}
Address: ${params.address}
Nonce: ${params.nonce}
Expires (unix ms): ${params.expiresAt}

Signing proves you control this wallet.`
}

export async function createWalletChallenge(
  db: Firestore,
  uid: string,
  chain: 'sol' | 'evm',
  addressRaw: string
): Promise<
  | { ok: true; challengeId: string; message: string; expiresAt: number }
  | { ok: false; error: string; status: number }
> {
  const address =
    chain === 'sol' ? normalizeSolWallet(addressRaw) : normalizeEvmWallet(addressRaw)
  if (!address) {
    return {
      ok: false,
      error:
        chain === 'sol'
          ? 'That Solana address is not valid. Check the public key and try again.'
          : 'That Ethereum address is not valid. Use a standard 0x-prefixed address.',
      status: 400,
    }
  }

  const challengeId = randomBytes(24).toString('hex')
  const expiresAt = Date.now() + TTL_MS
  const nonce = randomBytes(16).toString('hex')
  const message = buildLinkMessage({ uid, chain, address, nonce, expiresAt })

  await db.collection(CHALLENGE_COL).doc(challengeId).set({
    uid,
    chain,
    address,
    message,
    expires_at: expiresAt,
    created_at: Date.now(),
  })

  return { ok: true, challengeId, message, expiresAt }
}

async function verifyEvmSignature(address: string, message: string, signature: string): Promise<boolean> {
  try {
    if (!signature?.startsWith('0x') || signature.length < 130) return false
    const addr = normalizeEvmWallet(address)
    if (!addr) return false
    return await verifyMessage({
      address: addr as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    })
  } catch {
    return false
  }
}

function verifySolSignature(address: string, message: string, signatureB64: string): boolean {
  try {
    const msg = new TextEncoder().encode(message)
    const sig = Buffer.from(signatureB64, 'base64')
    if (sig.length !== 64) return false
    const pub = new PublicKey(address).toBytes()
    return nacl.sign.detached.verify(msg, new Uint8Array(sig), pub)
  } catch {
    return false
  }
}

function parseVerifiedList(prev: Record<string, unknown>): VerifiedWalletEntry[] {
  const raw = prev.verified_wallets
  if (!Array.isArray(raw)) return []
  const out: VerifiedWalletEntry[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    if (o.chain !== 'sol' && o.chain !== 'evm') continue
    if (typeof o.address !== 'string') continue
    const norm = o.chain === 'sol' ? normalizeSolWallet(o.address) : normalizeEvmWallet(o.address)
    if (!norm) continue
    const verified_at = typeof o.verified_at === 'number' ? o.verified_at : Date.now()
    out.push({ chain: o.chain, address: norm, verified_at })
  }
  return out
}

export async function verifyWalletChallengeAndLink(
  db: Firestore,
  uid: string,
  input: { challengeId: string; signature: string }
): Promise<
  | { ok: true; verified_wallets: VerifiedWalletEntry[] }
  | { ok: false; error: string; status: number }
> {
  const ref = db.collection(CHALLENGE_COL).doc(input.challengeId)
  const snap = await ref.get()
  if (!snap.exists) {
    return { ok: false, error: 'This verification step is invalid or has expired. Please start again.', status: 400 }
  }

  const c = snap.data() as {
    uid: string
    chain: 'sol' | 'evm'
    address: string
    message: string
    expires_at: number
  }

  if (c.uid !== uid) {
    return { ok: false, error: 'This challenge does not match your signed-in account.', status: 403 }
  }
  if (Date.now() > c.expires_at) {
    await ref.delete().catch(() => {})
    return { ok: false, error: 'That verification code has expired. Please start again.', status: 400 }
  }

  const sigOk =
    c.chain === 'evm'
      ? await verifyEvmSignature(c.address, c.message, input.signature)
      : verifySolSignature(c.address, c.message, input.signature)

  if (!sigOk) {
    return { ok: false, error: 'The wallet signature could not be verified. Try again or use a different wallet.', status: 401 }
  }

  const profRef = db.collection(FS.BUILDER_PROFILES).doc(uid)
  const profSnap = await profRef.get()
  const prev = profSnap.exists ? (profSnap.data() as Record<string, unknown>) : {}
  let list = parseVerifiedList(prev)

  if (list.some((w) => w.chain === c.chain && w.address === c.address)) {
    await ref.delete().catch(() => {})
    return { ok: true, verified_wallets: list }
  }

  const cref = db.collection(CLAIMS).doc(claimDocId(c.chain, c.address))
  const existingClaim = await cref.get()
  if (existingClaim.exists) {
    const owner = (existingClaim.data() as { user_id?: string })?.user_id
    if (owner && owner !== uid) {
      await ref.delete().catch(() => {})
      return {
        ok: false,
        error: 'This wallet is already linked to another Buildry account.',
        status: 409,
      }
    }
  }

  try {
    await db.runTransaction(async (tx) => {
      const claimSnap = await tx.get(cref)
      if (claimSnap.exists) {
        const owner = (claimSnap.data() as { user_id?: string })?.user_id
        if (owner && owner !== uid) {
          throw Object.assign(new Error('ADDR_TAKEN'), { code: 'CONFLICT' })
        }
      }

      const pSnap = await tx.get(profRef)
      const pdata = pSnap.exists ? (pSnap.data() as Record<string, unknown>) : {}
      list = parseVerifiedList(pdata)
      if (!list.some((w) => w.chain === c.chain && w.address === c.address)) {
        if (list.length >= MAX_VERIFIED_WALLETS) {
          throw Object.assign(new Error('WALLET_LIMIT'), { code: 'LIMIT' })
        }
        const entry: VerifiedWalletEntry = { chain: c.chain, address: c.address, verified_at: Date.now() }
        list = [...list, entry]
      }

      const primarySol = list.find((w) => w.chain === 'sol')?.address ?? null
      const primaryEvm = list.find((w) => w.chain === 'evm')?.address ?? null

      tx.set(cref, {
        user_id: uid,
        chain: c.chain,
        address: c.address,
        updated_at: Date.now(),
      })

      tx.set(
        profRef,
        {
          user_id: uid,
          id: uid,
          verified_wallets: list,
          sol_wallet: primarySol,
          evm_wallet: primaryEvm,
          updated_at: Date.now(),
        },
        { merge: true }
      )
    })
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string }
    if (err.code === 'LIMIT' || err.message === 'WALLET_LIMIT') {
      await ref.delete().catch(() => {})
      return {
        ok: false,
        error: `You can link at most ${MAX_VERIFIED_WALLETS} wallets. Remove one to add another.`,
        status: 400,
      }
    }
    if (err.code === 'CONFLICT' || err.message === 'ADDR_TAKEN') {
      await ref.delete().catch(() => {})
      return {
        ok: false,
        error: 'This wallet is already linked to another Buildry account.',
        status: 409,
      }
    }
    console.error('verifyWalletChallengeAndLink:', e)
    return { ok: false, error: 'We could not save this wallet. Please try again in a moment.', status: 500 }
  }

  await ref.delete().catch(() => {})

  const finalSnap = await profRef.get()
  const finalList = finalSnap.exists ? parseVerifiedList(finalSnap.data() as Record<string, unknown>) : list
  return { ok: true, verified_wallets: finalList }
}

function reorderPrimary(list: VerifiedWalletEntry[], chain: 'sol' | 'evm', address: string): VerifiedWalletEntry[] {
  const norm = chain === 'sol' ? normalizeSolWallet(address) : normalizeEvmWallet(address)
  if (!norm) return list
  const idx = list.findIndex((w) => w.chain === chain && w.address === norm)
  if (idx < 0) return list
  const match = list[idx]
  const without = list.filter((_, i) => i !== idx)
  const sameChainRest = without.filter((w) => w.chain === chain)
  const otherChain = without.filter((w) => w.chain !== chain)
  return [match, ...sameChainRest, ...otherChain]
}

function withPrimaryFields(list: VerifiedWalletEntry[]) {
  const primarySol = list.find((w) => w.chain === 'sol')?.address ?? null
  const primaryEvm = list.find((w) => w.chain === 'evm')?.address ?? null
  return { list, primarySol, primaryEvm }
}

export async function setPrimaryVerifiedWallet(
  db: Firestore,
  uid: string,
  chain: 'sol' | 'evm',
  addressRaw: string
): Promise<{ ok: true; verified_wallets: VerifiedWalletEntry[] } | { ok: false; error: string; status: number }> {
  const address = chain === 'sol' ? normalizeSolWallet(addressRaw) : normalizeEvmWallet(addressRaw)
  if (!address) {
    return { ok: false, error: 'That wallet address is not valid.', status: 400 }
  }

  const profRef = db.collection(FS.BUILDER_PROFILES).doc(uid)
  const profSnap = await profRef.get()
  if (!profSnap.exists) {
    return { ok: false, error: 'Profile not found.', status: 404 }
  }

  const prev = profSnap.data() as Record<string, unknown>
  let list = parseVerifiedList(prev)
  if (!list.some((w) => w.chain === chain && w.address === address)) {
    return { ok: false, error: 'That wallet is not linked to your profile.', status: 400 }
  }

  list = reorderPrimary(list, chain, address)
  const { primarySol, primaryEvm } = withPrimaryFields(list)

  await profRef.set(
    {
      verified_wallets: list,
      sol_wallet: primarySol,
      evm_wallet: primaryEvm,
      updated_at: Date.now(),
    },
    { merge: true }
  )

  return { ok: true, verified_wallets: list }
}

export async function removeVerifiedWallet(
  db: Firestore,
  uid: string,
  chain: 'sol' | 'evm',
  addressRaw: string
): Promise<{ ok: true; verified_wallets: VerifiedWalletEntry[] } | { ok: false; error: string; status: number }> {
  const address = chain === 'sol' ? normalizeSolWallet(addressRaw) : normalizeEvmWallet(addressRaw)
  if (!address) {
    return { ok: false, error: 'That wallet address is not valid.', status: 400 }
  }

  const profRef = db.collection(FS.BUILDER_PROFILES).doc(uid)
  const profSnap = await profRef.get()
  if (!profSnap.exists) {
    return { ok: false, error: 'Profile not found.', status: 404 }
  }

  const prev = profSnap.data() as Record<string, unknown>
  let list = parseVerifiedList(prev)
  if (!list.some((w) => w.chain === chain && w.address === address)) {
    return { ok: false, error: 'That wallet is not linked to your profile.', status: 400 }
  }

  const cref = db.collection(CLAIMS).doc(claimDocId(chain, address))

  try {
    await db.runTransaction(async (tx) => {
      const pSnap = await tx.get(profRef)
      if (!pSnap.exists) throw new Error('NO_PROFILE')
      const pdata = pSnap.data() as Record<string, unknown>
      list = parseVerifiedList(pdata).filter((w) => !(w.chain === chain && w.address === address))
      const { primarySol, primaryEvm } = withPrimaryFields(list)
      tx.delete(cref)
      tx.set(
        profRef,
        {
          verified_wallets: list,
          sol_wallet: primarySol,
          evm_wallet: primaryEvm,
          updated_at: Date.now(),
        },
        { merge: true }
      )
    })
  } catch (e) {
    console.error('removeVerifiedWallet:', e)
    return { ok: false, error: 'We could not remove this wallet. Try again shortly.', status: 500 }
  }

  const finalSnap = await profRef.get()
  const finalList = finalSnap.exists ? parseVerifiedList(finalSnap.data() as Record<string, unknown>) : []
  return { ok: true, verified_wallets: finalList }
}
