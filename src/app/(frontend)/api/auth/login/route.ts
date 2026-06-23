import { getPayload } from 'payload'
import config from '@payload-config'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email: string = (body.email ?? body.username ?? '').trim().toLowerCase()
    const password: string = body.password ?? ''
    const payload = await getPayload({ config })

    const result = await payload.login({
      collection: 'accounts',
      data: { email, password },
    })

    if (!result.user) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 },
      )
    }

    const response = NextResponse.json({
      success: true,
      user: { id: result.user.id, email: result.user.email },
    })

    // Set the Payload auth cookie
    if (result.token) {
      response.cookies.set('payload-token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'lax',
      })
    }

    return response
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid credentials' },
      { status: 401 },
    )
  }
}
