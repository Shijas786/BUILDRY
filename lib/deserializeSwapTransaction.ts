import bs58 from 'bs58'
import { Transaction, VersionedTransaction } from '@solana/web3.js'

function unwrapSwapTransactionString(raw: string): string {
  let s = raw.trim()
  if (!s) return s
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    try {
      s = JSON.parse(s) as string
    } catch {
      s = s.slice(1, -1)
    }
  }
  return s.trim()
}

/**
 * Bags `/trade/swap` returns `swapTransaction` as **base58** (see `@bagsfm/bags-sdk` TradeService).
 * We also accept base64, hex, byte arrays for older/alternate responses.
 */
function stringToWireCandidates(s: string): Buffer[] {
  const t = unwrapSwapTransactionString(s)
  if (!t) return []
  const out: Buffer[] = []

  try {
    const b58 = bs58.decode(t)
    if (b58.length > 0) out.push(Buffer.from(b58))
  } catch {
    /* not base58 */
  }

  const fromB64 = Buffer.from(t, 'base64')
  if (fromB64.length > 0) out.push(fromB64)

  if (/^[0-9a-fA-F]+$/i.test(t) && t.length % 2 === 0 && t.length >= 64) {
    out.push(Buffer.from(t, 'hex'))
  }

  return out
}

function tryDeserializeBuffers(buffers: Buffer[]): VersionedTransaction | Transaction {
  for (const buf of buffers) {
    if (buf.length === 0) continue
    try {
      return VersionedTransaction.deserialize(buf)
    } catch {
      /* try legacy */
    }
    try {
      return Transaction.from(buf)
    } catch {
      /* next candidate */
    }
  }
  throw new Error('Could not parse swap transaction from Bags')
}

/**
 * Raw bytes from JSON number[], Buffer shapes, etc. (not base58 strings).
 */
export function swapTransactionPayloadToBuffer(payload: unknown): Buffer {
  if (payload == null) throw new Error('Missing swap transaction')

  if (Buffer.isBuffer(payload)) {
    if (payload.length === 0) throw new Error('Empty swap transaction')
    return payload
  }

  if (payload instanceof Uint8Array) {
    if (payload.length === 0) throw new Error('Empty swap transaction')
    return Buffer.from(payload)
  }

  if (Array.isArray(payload)) {
    if (!payload.length || typeof payload[0] !== 'number') {
      throw new Error('Invalid swap transaction byte array')
    }
    return Buffer.from(payload as number[])
  }

  if (typeof payload === 'object' && payload !== null && 'data' in payload) {
    const d = (payload as { data?: unknown }).data
    if (Array.isArray(d) && d.length && typeof d[0] === 'number') {
      return Buffer.from(d as number[])
    }
  }

  if (typeof payload === 'string') {
    const candidates = stringToWireCandidates(payload)
    if (candidates.length === 0) throw new Error('Empty swap transaction')
    return serializeBagsTransactionForWire(tryDeserializeBuffers(candidates))
  }

  throw new Error('Unexpected swap transaction format from Bags')
}

/** Normalize to wire bytes for JSON/base64 transport after a successful parse. */
export function serializeBagsTransactionForWire(tx: VersionedTransaction | Transaction): Buffer {
  if (tx instanceof VersionedTransaction) {
    return Buffer.from(tx.serialize())
  }
  return tx.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  })
}

/**
 * Deserialize legacy or v0 transaction from Bags (base58 string is the common case).
 */
export function deserializeSwapTransactionFromBagsPayload(
  payload: unknown
): VersionedTransaction | Transaction {
  if (typeof payload === 'string') {
    const candidates = stringToWireCandidates(payload)
    if (candidates.length === 0) throw new Error('Empty swap transaction')
    return tryDeserializeBuffers(candidates)
  }

  const buf = swapTransactionPayloadToBuffer(payload)
  return tryDeserializeBuffers([buf])
}

/** @deprecated use deserializeSwapTransactionFromBagsPayload */
export function deserializeSwapTransactionBase64(base64: string): VersionedTransaction | Transaction {
  return deserializeSwapTransactionFromBagsPayload(base64)
}
