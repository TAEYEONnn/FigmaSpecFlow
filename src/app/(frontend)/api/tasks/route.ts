import { NextResponse } from 'next/server'
import { z } from 'zod'

import { apiError } from '@/lib/api/response'
import { createTaskSchema } from '@/lib/tasks/schema'
import { createTask, listTasks } from '@/lib/tasks/service'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    return NextResponse.json({
      tasks: await listTasks({
        teamId: url.searchParams.get('teamId'),
        personal: url.searchParams.get('personal') === 'true' || undefined,
        assignedToMe: url.searchParams.get('assignedToMe') === 'true' || undefined,
        status: (url.searchParams.get('status') || undefined) as
          | 'todo'
          | 'inProgress'
          | 'done'
          | undefined,
        search: url.searchParams.get('search') || undefined,
      }),
    })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const input = createTaskSchema.parse(await request.json())
    return NextResponse.json({ task: await createTask(input) }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? '입력값을 확인해 주세요.' }, { status: 422 })
    }
    return apiError(error)
  }
}
