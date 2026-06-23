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

// Used only to clear the legacy Partitioned cookie that was set by old deployments.
// Browsers treat Partitioned cookies as a separate identity from non-Partitioned cookies,
// so we must expire them with the same Partitioned attribute they were created with.
export const LEGACY_PARTITIONED_CLEAR_OPTIONS: Partial<ResponseCookie> = {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  path: '/',
  partitioned: true,
  maxAge: 0,
  expires: new Date(0),
}

/** @deprecated use AUTH_COOKIE_OPTIONS directly */
export function getAuthCookieOptions(_isProduction: boolean): Partial<ResponseCookie> {
  return AUTH_COOKIE_OPTIONS
}
