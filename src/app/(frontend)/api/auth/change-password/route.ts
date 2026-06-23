import { getPayload } from 'payload'
import config from '@payload-config'
import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/context'

export async function POST(request: Request) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  try {
    const { currentPassword, newPassword } = await request.json()
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: '현재 비밀번호와 새 비밀번호를 입력해 주세요.' }, { status: 400 })
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: '새 비밀번호는 8자 이상이어야 합니다.' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    // 현재 비밀번호 검증
    const user = await payload.findByID({ collection: 'accounts', id: auth.userId })
    const loginCheck = await payload.login({
      collection: 'accounts',
      data: { email: user.email as string, password: currentPassword },
    }).catch(() => null)

    if (!loginCheck?.user) {
      return NextResponse.json({ error: '현재 비밀번호가 올바르지 않아요.' }, { status: 400 })
    }

    // 비밀번호 변경
    await payload.update({
      collection: 'accounts',
      id: auth.userId,
      data: { password: newPassword } as Record<string, unknown>,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '비밀번호를 변경하지 못했어요.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
