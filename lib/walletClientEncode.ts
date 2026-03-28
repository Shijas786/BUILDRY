/** Encode a Solana ed25519 signature (64 bytes) for JSON transport. */
export function uint8ArrayToBase64(u8: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(u8).toString('base64')
  }
  let s = ''
  for (let i = 0; i < u8.length; i += 1) s += String.fromCharCode(u8[i]!)
  return btoa(s)
}
