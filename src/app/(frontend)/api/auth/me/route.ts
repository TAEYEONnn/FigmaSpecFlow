import { getPayload } from 'payload'
import config from '@payload-config'
import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/context'

export async function GET() {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const payload = await getPayload({ config })
  const user = await payload.findByID({ collection: 'accounts', id: auth.userId })

  return NextResponse.json({
    id: String(user.id),
    email: user.email,
    displayName: (user as unknown as Record<string, unknown>).displayName ?? null,
  })
}

export async function PATCH(request: Request) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  try {
    const { displayName } = await request.json()
    const payload = await getPayload({ config })
    await payload.update({
      collection: 'accounts',
      id: auth.userId,
      data: { displayName } as Record<string, unknown>,
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '프로필을 저장하지 못했어요.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
