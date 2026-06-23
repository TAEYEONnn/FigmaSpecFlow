import { NextResponse } from 'next/server'
import { createTeam, listMyTeams } from '@/lib/teams/service'
import { getAuthContext } from '@/lib/auth/context'

export async function GET() {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  try {
    const teams = await listMyTeams()
    return NextResponse.json({ teams })
  } catch {
    return NextResponse.json({ error: '팀 목록을 불러오지 못했어요.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  try {
    const { name } = await request.json()
    if (!name?.trim()) return NextResponse.json({ error: '팀 이름을 입력해 주세요.' }, { status: 400 })
    const team = await createTeam(name.trim())
    return NextResponse.json({ team }, { status: 201 })
  } catch {
    return NextResponse.json({ error: '팀을 만들지 못했어요.' }, { status: 500 })
  }
}
