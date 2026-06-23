import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/context'
import { transferOwnership } from '@/lib/teams/service'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> },
) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  try {
    const { teamId } = await params
    const { toUserId } = await request.json()
    if (!toUserId?.trim()) return NextResponse.json({ error: '대상 사용자 ID를 입력해 주세요.' }, { status: 400 })
    await transferOwnership(teamId, toUserId.trim())
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '소유권을 이전하지 못했어요.'
    const status = msg.includes('소유자') ? 403 : 400
    return NextResponse.json({ error: msg }, { status })
  }
}
