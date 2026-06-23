import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/context'
import { leaveTeam } from '@/lib/teams/service'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ teamId: string }> },
) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  try {
    const { teamId } = await params
    await leaveTeam(teamId)
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '팀을 나가지 못했어요.'
    const status = msg.includes('소유자') ? 403 : 400
    return NextResponse.json({ error: msg }, { status })
  }
}
