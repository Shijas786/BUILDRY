/**
 * OAuth apps (LinkedIn, GitHub) must register this exact redirect URL — Firebase uses it, not your marketing domain.
 * @see https://firebase.google.com/docs/auth/web/redirect-best-practices
 */
export function getFirebaseAuthHandlerUrl(): string {
  const raw = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim()
  if (!raw) return ''
  const host = raw.replace(/^https?:\/\//i, '').split('/')[0] || ''
  if (!host) return ''
  return `https://${host}/__/auth/handler`
}
