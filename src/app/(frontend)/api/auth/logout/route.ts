import { NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS, LEGACY_PARTITIONED_CLEAR_OPTIONS } from '@/lib/auth/cookie'

export async function POST() {
  const response = NextResponse.json({ success: true })
  // Expire canonical cookie
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: 0,
    expires: new Date(0),
  })
  // Clear any legacy Partitioned cookie from old deployments
  response.cookies.set(AUTH_COOKIE_NAME, '', LEGACY_PARTITIONED_CLEAR_OPTIONS)
  return response
}
