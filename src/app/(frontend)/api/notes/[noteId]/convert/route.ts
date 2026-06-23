import { NextResponse } from 'next/server'
import { z } from 'zod'

import { apiError } from '@/lib/api/response'
import { convertScratchSchema } from '@/lib/notes/schema'
import { convertScratchToNote, convertScratchToTask } from '@/lib/notes/service'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ noteId: string }> },
) {
  try {
    const { noteId } = await params
    const { target } = convertScratchSchema.parse(await request.json())
    if (target === 'note') {
      return NextResponse.json({ type: 'note', note: await convertScratchToNote(noteId) })
    }
    return NextResponse.json({ type: 'task', task: await convertScratchToTask(noteId) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '전환 대상을 확인해 주세요.' }, { status: 422 })
    }
    return apiError(error)
  }
}
