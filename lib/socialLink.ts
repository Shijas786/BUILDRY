'use client'

import {
  GithubAuthProvider,
  OAuthProvider,
  getAdditionalUserInfo,
  getRedirectResult,
  linkWithPopup,
  linkWithRedirect,
  type UserCredential,
} from 'firebase/auth'
import { firebaseAuth } from '@/lib/firebaseClient'

/** Must match Firebase Console → Authentication → OpenID Connect → Provider ID `linkedin` → full id `oidc.linkedin`. */
const LINKEDIN_FIREBASE_PROVIDER_ID =
  process.env.NEXT_PUBLIC_FIREBASE_LINKEDIN_PROVIDER_ID ?? 'oidc.linkedin'

function decodeJwtPayload(idToken: string): Record<string, unknown> {
  try {
    const payload = idToken.split('.')[1]
    if (!payload) return {}
    let b64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    while (b64.length % 4) b64 += '='
    const json = atob(b64)
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return {}
  }
}

function linkedinProfileFromCredential(cred: UserCredential): {
  linkedinUrl?: string
  linkedinData: Record<string, unknown>
} {
  const info = getAdditionalUserInfo(cred)
  const profile = { ...((info?.profile ?? {}) as Record<string, unknown>) }

  const oauthCred = OAuthProvider.credentialFromResult(cred)
  const idToken = oauthCred?.idToken
  if (idToken) {
    const claims = decodeJwtPayload(idToken)
    for (const [k, v] of Object.entries(claims)) {
      if (profile[k] === undefined && v !== undefined) profile[k] = v
    }
  }

  const vanity =
    (typeof profile.vanityName === 'string' && profile.vanityName) ||
    (typeof profile.slug === 'string' && profile.slug) ||
    (typeof profile.publicIdentifier === 'string' && profile.publicIdentifier) ||
    (typeof profile.nickname === 'string' && profile.nickname) ||
    ''

  const linkedinUrl = vanity
    ? `https://www.linkedin.com/in/${String(vanity).replace(/^\/+/, '')}`
    : ''

  return {
    ...(linkedinUrl ? { linkedinUrl } : {}),
    linkedinData: profile,
  }
}

function linkedInLinkErrorMessage(e: unknown): string {
  const err = e as { code?: string; message?: string }
  if (err.code === 'auth/operation-not-allowed') {
    return 'LinkedIn is off or misconfigured in Firebase. Add OpenID Connect (Custom providers): Issuer https://www.linkedin.com/oauth, Provider ID linkedin (client uses oidc.linkedin), plus LinkedIn Client ID and Secret.'
  }
  if (err.code === 'auth/unauthorized-domain') {
    return 'This site’s domain is not allowed for Firebase Auth. Add it under Firebase Console → Authentication → Settings → Authorized domains.'
  }
  if (err.code === 'auth/credential-already-in-use') {
    return 'This LinkedIn account is already linked to another Buildry user.'
  }
  if (err.code === 'auth/provider-already-linked') {
    return 'LinkedIn is already linked to this account.'
  }
  if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
    return 'LinkedIn window was closed before finishing.'
  }
  if (err.code === 'auth/popup-blocked') {
    return 'Your browser blocked the popup. Allow popups for this site and try again.'
  }
  return err.message || 'Could not connect LinkedIn.'
}

/**
 * Starts LinkedIn link via **full-page redirect** (avoids COOP / popup `window.close` issues).
 * After LinkedIn redirects back, call `completeLinkedInLinkFromRedirect()` once (e.g. on Settings mount).
 */
export async function startLinkedInLinkRedirect(): Promise<{ error: string | null }> {
  if (!firebaseAuth?.currentUser) {
    return { error: 'Sign in first, then connect LinkedIn from Socials.' }
  }

  const provider = new OAuthProvider(LINKEDIN_FIREBASE_PROVIDER_ID)
  provider.addScope('openid')
  provider.addScope('profile')
  provider.addScope('email')

  try {
    await linkWithRedirect(firebaseAuth.currentUser, provider)
    return { error: null }
  } catch (e: unknown) {
    return { error: linkedInLinkErrorMessage(e) }
  }
}

/**
 * Finishes LinkedIn linking after `startLinkedInLinkRedirect()` returns the user to the app.
 * Safe to call on every load: no-op when there is no pending redirect result.
 */
export async function completeLinkedInLinkFromRedirect(): Promise<{
  error: string | null
  handled: boolean
  linkedinUrl?: string
  linkedinData?: Record<string, unknown>
}> {
  if (!firebaseAuth) {
    return { error: null, handled: false }
  }

  try {
    const cred = await getRedirectResult(firebaseAuth)
    if (!cred) {
      return { error: null, handled: false }
    }

    const { linkedinUrl, linkedinData } = linkedinProfileFromCredential(cred)
    return { error: null, handled: true, linkedinUrl, linkedinData }
  } catch (e: unknown) {
    return { error: linkedInLinkErrorMessage(e), handled: false }
  }
}

/** @deprecated Prefer `startLinkedInLinkRedirect` + `completeLinkedInLinkFromRedirect` (popup hits COOP in some browsers). */
export async function linkLinkedInToProfile(): Promise<{
  error: string | null
  linkedinUrl?: string
  linkedinData?: Record<string, unknown>
}> {
  if (!firebaseAuth?.currentUser) {
    return { error: 'Sign in first, then connect LinkedIn from Socials.' }
  }

  const provider = new OAuthProvider(LINKEDIN_FIREBASE_PROVIDER_ID)
  provider.addScope('openid')
  provider.addScope('profile')
  provider.addScope('email')

  try {
    const cred = await linkWithPopup(firebaseAuth.currentUser, provider)
    const { linkedinUrl, linkedinData } = linkedinProfileFromCredential(cred)
    return {
      error: null,
      ...(linkedinUrl ? { linkedinUrl } : {}),
      linkedinData,
    }
  } catch (e: unknown) {
    return { error: linkedInLinkErrorMessage(e) }
  }
}

/**
 * Links GitHub to the current Firebase user (Settings → Socials).
 * Enable the **GitHub** provider in Firebase Authentication and register the Firebase auth handler URL on your GitHub OAuth app.
 */
export async function linkGitHubToProfile(): Promise<{
  error: string | null
  githubUsername?: string
  githubData?: Record<string, unknown>
}> {
  if (!firebaseAuth?.currentUser) {
    return { error: 'Sign in first, then connect GitHub from Socials.' }
  }

  const provider = new GithubAuthProvider()

  try {
    const cred = await linkWithPopup(firebaseAuth.currentUser, provider)
    const info = getAdditionalUserInfo(cred)
    const profile = { ...((info?.profile ?? {}) as Record<string, unknown>) }

    const login =
      (typeof profile.login === 'string' && profile.login) ||
      (typeof profile.username === 'string' && profile.username) ||
      ''

    const githubUsername = login ? String(login).replace(/^\/+/, '').trim() : ''

    return {
      error: null,
      ...(githubUsername ? { githubUsername } : {}),
      githubData: profile,
    }
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string }
    if (err.code === 'auth/operation-not-allowed') {
      return {
        error:
          'GitHub sign-in is off in Firebase. In Firebase Console → Authentication → Sign-in method, enable GitHub and add your GitHub OAuth App Client ID and Client Secret.',
      }
    }
    if (err.code === 'auth/unauthorized-domain') {
      return {
        error:
          'This site’s domain is not allowed for Firebase Auth. Add it under Firebase Console → Authentication → Settings → Authorized domains.',
      }
    }
    if (err.code === 'auth/credential-already-in-use') {
      return { error: 'This GitHub account is already linked to another Buildry user.' }
    }
    if (err.code === 'auth/provider-already-linked') {
      return { error: 'GitHub is already linked to this account.' }
    }
    if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
      return { error: 'GitHub window was closed before finishing.' }
    }
    if (err.code === 'auth/popup-blocked') {
      return { error: 'Your browser blocked the popup. Allow popups for this site and try again.' }
    }
    return { error: err.message || 'Could not connect GitHub.' }
  }
}
