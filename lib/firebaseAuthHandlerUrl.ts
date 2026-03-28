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

/** LinkedIn/GitHub should allow every URL returned here (usually firebaseapp.com; also web.app for some flows). */
export function getFirebaseOAuthRedirectUrls(): string[] {
  const primary = getFirebaseAuthHandlerUrl()
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim()
  const webApp =
    projectId && /^[a-z0-9-]+$/i.test(projectId)
      ? `https://${projectId}.web.app/__/auth/handler`
      : ''
  const out = [primary, webApp].filter(Boolean)
  return out.length ? Array.from(new Set(out)) : []
}
