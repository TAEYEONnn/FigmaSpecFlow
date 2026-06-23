import { NextResponse } from 'next/server'
import { z } from 'zod'

import { apiError } from '@/lib/api/response'
import { reactionSchema } from '@/lib/chat/schema'
import { addReaction } from '@/lib/chat/service'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ messageId: string }> },
) {
  try {
    const { messageId } = await params
    const { emoji } = reactionSchema.parse(await request.json())
    return NextResponse.json({ message: await addReaction(messageId, emoji) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '반응을 확인해 주세요.' }, { status: 422 })
    }
    return apiError(error)
  }
}
