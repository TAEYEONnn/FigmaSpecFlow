import { NextResponse } from 'next/server'
import { z } from 'zod'

import { apiError } from '@/lib/api/response'
import { updateTaskSchema } from '@/lib/tasks/schema'
import { deleteTask, updateTask } from '@/lib/tasks/service'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const { taskId } = await params
    const input = updateTaskSchema.parse(await request.json())
    return NextResponse.json({ task: await updateTask(taskId, input) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '입력값을 확인해 주세요.' }, { status: 422 })
    }
    return apiError(error)
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const { taskId } = await params
    await deleteTask(taskId)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return apiError(error)
  }
}
