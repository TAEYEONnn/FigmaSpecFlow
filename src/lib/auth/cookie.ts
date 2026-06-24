import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

// Renamed from 'payload-token' to avoid conflict with the Payload Admin cookie.
// Payload Admin (/admin) also uses 'payload-token' at path '/'.
// Using a distinct name keeps the two sessions independent in the same browser.
export const AUTH_COOKIE_NAME = 'app-session'

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
