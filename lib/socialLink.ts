'use client'

import { GithubAuthProvider, OAuthProvider, linkWithPopup, getAdditionalUserInfo } from 'firebase/auth'
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

/**
 * Links LinkedIn to the current Firebase user (Settings → Socials).
 * Requires LinkedIn via Firebase **OpenID Connect** (Custom provider), not the rare native "LinkedIn" tile.
 */
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
      error: null,
      ...(linkedinUrl ? { linkedinUrl } : {}),
      linkedinData: profile,
    }
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string }
    if (err.code === 'auth/operation-not-allowed') {
      return {
        error:
          'LinkedIn is off or misconfigured in Firebase. Add OpenID Connect (Custom providers): Issuer https://www.linkedin.com/oauth, Provider ID linkedin (client uses oidc.linkedin), plus LinkedIn Client ID and Secret.',
      }
    }
    if (err.code === 'auth/unauthorized-domain') {
      return {
        error:
          'This site’s domain is not allowed for Firebase Auth. Add it under Firebase Console → Authentication → Settings → Authorized domains.',
      }
    }
    if (err.code === 'auth/credential-already-in-use') {
      return { error: 'This LinkedIn account is already linked to another Buildry user.' }
    }
    if (err.code === 'auth/provider-already-linked') {
      return { error: 'LinkedIn is already linked to this account.' }
    }
    if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
      return { error: 'LinkedIn window was closed before finishing.' }
    }
    if (err.code === 'auth/popup-blocked') {
      return { error: 'Your browser blocked the popup. Allow popups for this site and try again.' }
    }
    return { error: err.message || 'Could not connect LinkedIn.' }
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
