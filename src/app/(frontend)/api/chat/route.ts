import { NextResponse } from 'next/server'
import { z } from 'zod'

import { apiError } from '@/lib/api/response'
import { createMessageSchema } from '@/lib/chat/schema'
import { createMessage, listMessages } from '@/lib/chat/service'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const teamId = url.searchParams.get('teamId')
    if (!teamId) return NextResponse.json({ error: '팀을 선택해 주세요.' }, { status: 422 })
    const limit = Number(url.searchParams.get('limit') ?? 50)
    return NextResponse.json({
      messages: await listMessages(teamId, {
        limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 50,
        before: url.searchParams.get('before') || undefined,
        after: url.searchParams.get('after') || undefined,
      }),
    })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const input = createMessageSchema.parse(await request.json())
    return NextResponse.json({ message: await createMessage(input) }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '메시지를 확인해 주세요.' }, { status: 422 })
    }
    return apiError(error)
  }
}
