import { getPayload } from 'payload'
import config from '@payload-config'
import { headers as nextHeaders } from 'next/headers'
import { AUTH_COOKIE_NAME } from '@/lib/auth/cookie'

export type AuthContext = {
  userId: string
  username: string
  demo: false
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const payload = await getPayload({ config })
  const headersList = await nextHeaders()

  // Read the service session cookie (app-session) and pass it as an
  // Authorization header so Payload's auth() treats it as the active token.
  // This keeps the service session independent from the Payload Admin
  // 'payload-token' cookie which lives at the same path.
  const rawCookies = headersList.get('cookie') ?? ''
  const appToken = rawCookies
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`))
    ?.slice(AUTH_COOKIE_NAME.length + 1) ?? null

  if (!appToken) return null

  const authHeaders = new Headers(Object.fromEntries(headersList.entries()))
  authHeaders.set('Authorization', `Bearer ${appToken}`)

  const { user } = await payload.auth({ headers: authHeaders })
  if (!user || user.collection !== 'accounts') return null
  return {
    userId: String(user.id),
    username: (user.email as string) ?? 'designer',
    demo: false,
  }
}

export async function requireAuthContext(): Promise<AuthContext> {
  const auth = await getAuthContext()
  if (!auth) {
    const { redirect } = await import('next/navigation')
    return redirect('/login')
  }
  return auth
}
