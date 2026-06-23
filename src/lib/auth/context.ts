import { getPayload } from 'payload'
import config from '@payload-config'
import { headers as nextHeaders } from 'next/headers'

export type AuthContext = {
  userId: string
  username: string
  demo: false
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const payload = await getPayload({ config })
  const headersList = await nextHeaders()
  const { user } = await payload.auth({
    headers: new Headers(Object.fromEntries(headersList.entries())),
  })
  if (!user) return null
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
