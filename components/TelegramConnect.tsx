'use client'

import React from 'react'

declare global {
  interface Window {
    onTelegramAuth?: (user: any) => void
  }
}

export default function TelegramConnect({
  botName,
  onConnected,
}: {
  botName: string
  onConnected: (telegramAuth: any) => void
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (!containerRef.current || !botName) return
    containerRef.current.innerHTML = ''

    window.onTelegramAuth = (user: any) => {
      onConnected(user)
    }

    const script = document.createElement('script')
    script.async = true
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', botName)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-userpic', 'false')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-request-access', 'write')
    containerRef.current.appendChild(script)

    return () => {
      window.onTelegramAuth = undefined
    }
  }, [botName, onConnected])

  return <div ref={containerRef} />
}

