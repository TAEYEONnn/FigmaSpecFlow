import { NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, getAuthCookieOptions } from '@/lib/auth/cookie'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    ...getAuthCookieOptions(process.env.NODE_ENV === 'production'),
    expires: new Date(0),
    maxAge: 0,
  })
  return response
}
