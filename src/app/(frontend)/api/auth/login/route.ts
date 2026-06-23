import { getPayload } from 'payload'
import config from '@payload-config'
import { NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS, LEGACY_PARTITIONED_CLEAR_OPTIONS } from '@/lib/auth/cookie'

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
    const payload = await getPayload({ config })

    const result = await payload.login({
      collection: 'accounts',
      data: { email, password },
    })

    if (!result.user) {
      if (isFormRequest) {
        return new NextResponse(null, {
          status: 303,
          headers: { location: '/login?error=invalid' },
        })
      }
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 },
      )
    }

    const response = isFormRequest
      ? new NextResponse(null, {
          status: 303,
          headers: { location: '/projects' },
        })
      : NextResponse.json({
          success: true,
          user: { id: result.user.id, email: result.user.email },
        })

    if (result.token) {
      // Set the canonical auth cookie
      response.cookies.set(AUTH_COOKIE_NAME, result.token, AUTH_COOKIE_OPTIONS)
      // Clear any legacy Partitioned cookie from old deployments
      response.cookies.set(AUTH_COOKIE_NAME, '', LEGACY_PARTITIONED_CLEAR_OPTIONS)
    }

    return response
  } catch (error) {
    if (isFormRequest) {
      return new NextResponse(null, {
        status: 303,
        headers: { location: '/login?error=invalid' },
      })
    }
    return NextResponse.json(
      { success: false, error: 'Invalid credentials' },
      { status: 401 },
    )
  }
}
