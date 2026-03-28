/** Heuristic: Firebase Auth UIDs are opaque alphanumeric strings (typical length ~28). */
export function looksLikeFirebaseAuthUid(s: string | undefined | null): boolean {
  if (!s || typeof s !== 'string') return false
  const t = s.trim()
  if (t.length < 20 || t.length > 128) return false
  return /^[A-Za-z0-9]+$/.test(t)
}
