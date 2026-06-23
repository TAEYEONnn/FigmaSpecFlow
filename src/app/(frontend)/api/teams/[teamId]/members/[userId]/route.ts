import { NextResponse } from 'next/server'
import { removeMember, changeMemberRole } from '@/lib/teams/service'
import { getAuthContext } from '@/lib/auth/context'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ teamId: string; userId: string }> },
) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  try {
    const { teamId, userId } = await params
    await removeMember(teamId, userId)
    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '멤버를 제거하지 못했어요.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ teamId: string; userId: string }> },
) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  try {
    const { teamId, userId } = await params
    const { role } = await request.json()
    if (role !== 'admin' && role !== 'member') {
      return NextResponse.json({ error: "역할은 'admin' 또는 'member'여야 해요." }, { status: 400 })
    }
    await changeMemberRole(teamId, userId, role)
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '역할을 변경하지 못했어요.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
