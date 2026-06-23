import { NextResponse } from 'next/server'
import { getTeam } from '@/lib/teams/service'
import { getAuthContext } from '@/lib/auth/context'

export async function GET(_req: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  try {
    const { teamId } = await params
    const team = await getTeam(teamId)
    return NextResponse.json({ members: team.members })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '멤버 목록을 불러오지 못했어요.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
