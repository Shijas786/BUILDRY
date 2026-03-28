import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'
import { mergeBuilderProfileFields } from '@/lib/firestoreAdminHelpers'

function verifyTelegramAuth(payload: Record<string, unknown>, botToken: string): boolean {
  const { hash, ...rest } = payload
  if (!hash || typeof hash !== 'string') return false

  const dataCheckString = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join('\n')

  const secret = crypto.createHash('sha256').update(botToken).digest()
  const hmac = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex')
  return hmac === hash
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, telegramAuth } = body
    const botToken = process.env.TELEGRAM_BOT_TOKEN || ''

    if (!userId || !telegramAuth || !botToken || !isFirebaseAdminConfigured) {
      return NextResponse.json({ error: 'Missing required fields or Firebase Admin not configured' }, { status: 400 })
    }

    const isValid = verifyTelegramAuth(telegramAuth as Record<string, unknown>, botToken)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid Telegram auth payload' }, { status: 401 })
    }

    const authDate = Number((telegramAuth as { auth_date?: number }).auth_date || 0)
    const now = Math.floor(Date.now() / 1000)
    if (!authDate || Math.abs(now - authDate) > 3600) {
      return NextResponse.json({ error: 'Telegram auth expired' }, { status: 401 })
    }

    const ta = telegramAuth as { username?: string; id?: number | string }
    const handle = ta.username || `${ta.id}`
    await mergeBuilderProfileFields(userId, { telegram_handle: handle })

    return NextResponse.json({ success: true, handle })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Telegram auth failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
