import { NextResponse } from 'next/server'
import { z } from 'zod'

import { apiError } from '@/lib/api/response'
import { updateMessageSchema } from '@/lib/chat/schema'
import { deleteMessage, updateMessage } from '@/lib/chat/service'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ messageId: string }> },
) {
  try {
    const { messageId } = await params
    const { content } = updateMessageSchema.parse(await request.json())
    return NextResponse.json({ message: await updateMessage(messageId, content) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '메시지를 확인해 주세요.' }, { status: 422 })
    }
    return apiError(error)
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ messageId: string }> },
) {
  try {
    const { messageId } = await params
    await deleteMessage(messageId)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return apiError(error)
  }
}
