import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

function verifyTelegramAuth(payload: Record<string, any>, botToken: string): boolean {
  const { hash, ...rest } = payload
  if (!hash) return false

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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

    if (!userId || !telegramAuth || !botToken || !supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const isValid = verifyTelegramAuth(telegramAuth, botToken)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid Telegram auth payload' }, { status: 401 })
    }

    const authDate = Number(telegramAuth.auth_date || 0)
    const now = Math.floor(Date.now() / 1000)
    if (!authDate || Math.abs(now - authDate) > 3600) {
      return NextResponse.json({ error: 'Telegram auth expired' }, { status: 401 })
    }

    const handle = telegramAuth.username || `${telegramAuth.id}`
    const supabase = createClient(supabaseUrl, supabaseKey)
    await supabase
      .from('builder_profiles')
      .upsert({ user_id: userId, telegram_handle: handle }, { onConflict: 'user_id' })

    return NextResponse.json({ success: true, handle })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Telegram auth failed' }, { status: 500 })
  }
}

