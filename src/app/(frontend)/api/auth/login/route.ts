import { getPayload } from 'payload'
import config from '@payload-config'
import { NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS } from '@/lib/auth/cookie'

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? ''
  const isFormRequest =
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')

  try {
    const body = isFormRequest
      ? Object.fromEntries(await request.formData())
      : await request.json()
    const email: string = (body.email ?? body.username ?? '').trim().toLowerCase()
    const password: string = body.password ?? ''
    // next: redirect destination after login (used by invitation flow etc.)
    const next: string = typeof body.next === 'string' ? body.next : ''
    const payload = await getPayload({ config })

    const result = await payload.login({
      collection: 'accounts',
      data: { email, password },
    })

    if (!result.user) {
      if (isFormRequest) {
        const errorBase = next ? `/login?error=invalid&next=${encodeURIComponent(next)}` : '/login?error=invalid'
        return new NextResponse(null, { status: 303, headers: { location: errorBase } })
      }
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
    }

    if (!result.token) {
      if (isFormRequest) {
        const errorBase = next
          ? `/login?error=session&next=${encodeURIComponent(next)}`
          : '/login?error=session'
        return new NextResponse(null, { status: 303, headers: { location: errorBase } })
      }
      return NextResponse.json(
        {
          success: false,
          error: 'AUTH_TOKEN_NOT_ISSUED',
          message: '로그인 세션을 만들지 못했어요.',
        },
        { status: 500 },
      )
    }

    const redirectTo = next && next.startsWith('/') ? next : '/projects'
    const response = isFormRequest
      ? new NextResponse(null, { status: 303, headers: { location: redirectTo } })
      : NextResponse.json({
          success: true,
          user: { id: result.user.id, email: result.user.email },
          redirectTo,
        })

    response.cookies.set(AUTH_COOKIE_NAME, result.token, AUTH_COOKIE_OPTIONS)

    return response
  } catch (error) {
    if (isFormRequest) {
      return new NextResponse(null, { status: 303, headers: { location: '/login?error=invalid' } })
    }
    return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
  }
}
