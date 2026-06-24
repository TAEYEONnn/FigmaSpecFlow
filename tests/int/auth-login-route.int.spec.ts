import { beforeEach, describe, expect, it, vi } from 'vitest'

const login = vi.fn()

vi.mock('payload', () => ({
  getPayload: vi.fn(async () => ({ login })),
}))

vi.mock('@payload-config', () => ({
  default: Promise.resolve({}),
}))

import { POST as loginRoute } from '@/app/(frontend)/api/auth/login/route'
import { POST as logoutRoute } from '@/app/(frontend)/api/auth/logout/route'

function jsonLoginRequest() {
  return new Request('https://workflowos.figma.site/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'xodusrla@kakao.com',
      password: '11111111',
    }),
  })
}

describe('auth session cookie responses', () => {
  beforeEach(() => {
    login.mockReset()
  })

  it('issues exactly one non-expired app-session after successful login', async () => {
    login.mockResolvedValue({
      token: 'header.payload.signature',
      user: { id: 'account-1', email: 'xodusrla@kakao.com' },
    })

    const response = await loginRoute(jsonLoginRequest())
    const setCookie = response.headers.get('set-cookie') ?? ''

    expect(response.status).toBe(200)
    expect(setCookie.match(/app-session=/g)).toHaveLength(1)
    expect(setCookie).toContain('app-session=header.payload.signature')
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('Secure')
    expect(setCookie).toContain('SameSite=lax')
    expect(setCookie).toContain('Path=/')
    expect(setCookie).not.toContain('Max-Age=0')
    expect(setCookie).not.toContain('1970')
    expect(setCookie).not.toContain('Partitioned')
  })

  it('returns 500 and does not issue a cookie when Payload returns no token', async () => {
    login.mockResolvedValue({
      token: null,
      user: { id: 'account-1', email: 'xodusrla@kakao.com' },
    })

    const response = await loginRoute(jsonLoginRequest())
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toMatchObject({
      error: 'AUTH_TOKEN_NOT_ISSUED',
    })
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('does not issue a cookie after invalid credentials', async () => {
    login.mockRejectedValue(new Error('invalid credentials'))

    const response = await loginRoute(jsonLoginRequest())

    expect(response.status).toBe(401)
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('expires the canonical cookie only on logout', async () => {
    const response = await logoutRoute()
    const setCookie = response.headers.get('set-cookie') ?? ''

    expect(response.status).toBe(200)
    expect(setCookie).toContain('app-session=')
    expect(setCookie).toContain('Max-Age=0')
    expect(setCookie).toContain('1970')
  })
})
