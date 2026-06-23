import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/context'
import { cancelInvitation } from '@/lib/teams/service'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ invitationId: string }> },
) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  try {
    const { invitationId } = await params
    await cancelInvitation(invitationId)
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '초대를 취소하지 못했어요.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
