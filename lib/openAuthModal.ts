export const OPEN_AUTH_MODAL_EVENT = 'buildry:open-auth-modal'

export type OpenAuthModalDetail = { mode: 'login' | 'signup' }

export function openAuthModal(mode: OpenAuthModalDetail['mode'] = 'login') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<OpenAuthModalDetail>(OPEN_AUTH_MODAL_EVENT, { detail: { mode } })
  )
}
