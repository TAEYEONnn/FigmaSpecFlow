import { getPayload } from 'payload'
import config from '@payload-config'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    const payload = await getPayload({ config })

    const result = await payload.login({
      collection: 'users',
      data: { email, password },
    })

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
