import { NextResponse } from 'next/server'
import { getInvitation } from '@/lib/teams/service'

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const invitation = await getInvitation(token)
    return NextResponse.json({ invitation })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '초대를 찾을 수 없어요.'
    return NextResponse.json({ error: msg }, { status: 404 })
  }
}
