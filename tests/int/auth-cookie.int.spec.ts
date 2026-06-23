import { describe, expect, it } from 'vitest'

import { getAuthCookieOptions, AUTH_COOKIE_OPTIONS } from '@/lib/auth/cookie'

describe('auth cookie policy', () => {
  // workflowos.payload.dev runs on HTTPS in all environments, so secure is always true.
  it('always sets secure:true (host runs on HTTPS)', () => {
    expect(getAuthCookieOptions(true)).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    })
  })

  it('production and dev return identical options', () => {
    expect(getAuthCookieOptions(true)).toEqual(getAuthCookieOptions(false))
    expect(getAuthCookieOptions(false)).toEqual(AUTH_COOKIE_OPTIONS)
  })

  it('does not set domain (host-only cookie)', () => {
    const opts = getAuthCookieOptions(true)
    expect((opts as Record<string, unknown>).domain).toBeUndefined()
  })
})
