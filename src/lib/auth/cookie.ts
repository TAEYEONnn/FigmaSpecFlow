import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

export const AUTH_COOKIE_NAME = 'payload-token'

// Always secure — the app runs on HTTPS (workflowos.payload.dev or production).
// No `domain` set so the cookie stays host-only (workflowos.payload.dev).
export const AUTH_COOKIE_OPTIONS: Partial<ResponseCookie> = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
}

/** @deprecated use AUTH_COOKIE_OPTIONS directly */
export function getAuthCookieOptions(_isProduction: boolean): Partial<ResponseCookie> {
  return AUTH_COOKIE_OPTIONS
}
