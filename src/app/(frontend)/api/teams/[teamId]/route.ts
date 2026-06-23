import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/context'
import { deleteTeam, renameTeam } from '@/lib/teams/service'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> },
) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  try {
    const { teamId } = await params
    const { name } = await request.json()
    if (!name?.trim()) return NextResponse.json({ error: '팀 이름을 입력해 주세요.' }, { status: 400 })
    await renameTeam(teamId, name.trim())
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '팀 이름을 변경하지 못했어요.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ teamId: string }> },
) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  try {
    const { teamId } = await params
    await deleteTeam(teamId)
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '팀을 삭제하지 못했어요.'
    const status = msg.includes('소유자') ? 403 : 400
    return NextResponse.json({ error: msg }, { status })
  }
}
