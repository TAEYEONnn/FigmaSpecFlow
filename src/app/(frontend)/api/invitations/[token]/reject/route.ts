import { NextResponse } from 'next/server'
import { rejectInvitation } from '@/lib/teams/service'
import { getAuthContext } from '@/lib/auth/context'

export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  try {
    const { token } = await params
    await rejectInvitation(token)
    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '초대를 거절하지 못했어요.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
