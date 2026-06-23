import { NextResponse } from 'next/server'
import { inviteMember, listPendingInvitations } from '@/lib/teams/service'
import { getAuthContext } from '@/lib/auth/context'

export async function GET(_req: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  try {
    const { teamId } = await params
    const invitations = await listPendingInvitations(teamId)
    return NextResponse.json({ invitations })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '초대 목록을 불러오지 못했어요.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  try {
    const { teamId } = await params
    const { email, role = 'member' } = await request.json()
    if (!email?.trim()) return NextResponse.json({ error: '초대할 이메일을 입력해 주세요.' }, { status: 400 })
    const result = await inviteMember(teamId, email.trim().toLowerCase(), role)
    return NextResponse.json({ invitation: result }, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '초대를 보내지 못했어요.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
