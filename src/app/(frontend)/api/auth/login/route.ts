import { getPayload } from 'payload'
import config from '@payload-config'
import { NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, getAuthCookieOptions } from '@/lib/auth/cookie'

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

    // Set the Payload auth cookie
    if (result.token) {
      response.cookies.set(
        AUTH_COOKIE_NAME,
        result.token,
        getAuthCookieOptions(process.env.NODE_ENV === 'production'),
      )
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
