import { getPayload } from 'payload'
import config from '@payload-config'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email?.trim() || !password?.trim()) {
      return NextResponse.json({ success: false, error: '이메일과 비밀번호를 입력해 주세요.' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ success: false, error: '비밀번호는 8자 이상이어야 합니다.' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    const user = await payload.create({
      collection: 'users',
      // Payload auth collections accept password at runtime but TS types omit it
      data: { email: email.trim().toLowerCase(), password } as { email: string },
    })

    const loginResult = await payload.login({
      collection: 'users',
      data: { email: email.trim().toLowerCase(), password },
    })

    const response = NextResponse.json({
      success: true,
      user: { id: String(user.id), email: user.email },
    })

    if (loginResult.token) {
      response.cookies.set('payload-token', loginResult.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'lax',
      })
    }

    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('duplicate') || message.includes('unique') || message.includes('E11000')) {
      return NextResponse.json({ success: false, error: '이미 사용 중인 이메일이에요.' }, { status: 409 })
    }
    return NextResponse.json({ success: false, error: '계정을 만들지 못했어요.' }, { status: 500 })
  }
}
