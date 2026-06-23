import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

export const AUTH_COOKIE_NAME = 'payload-token'

export function getAuthCookieOptions(isProduction: boolean): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    secure: isProduction,
    path: '/',
    sameSite: 'lax',
  }
}
