import { describe, expect, it } from 'vitest'

import { getAuthCookieOptions } from '@/lib/auth/cookie'

describe('auth cookie policy', () => {
  it('supports authentication inside the Figma iframe in production', () => {
    expect(getAuthCookieOptions(true)).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      partitioned: true,
      path: '/',
    })
  })

  it('uses local-development-compatible cookie settings', () => {
    expect(getAuthCookieOptions(false)).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      partitioned: false,
      path: '/',
    })
  })
})
