import { NextResponse } from 'next/server'
import { z } from 'zod'

import { apiError } from '@/lib/api/response'
import { createNoteSchema } from '@/lib/notes/schema'
import { createNote, listNotes } from '@/lib/notes/service'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    return NextResponse.json({
      notes: await listNotes({
        teamId: url.searchParams.get('teamId'),
        personal: url.searchParams.get('personal') === 'true' || undefined,
        kind: (url.searchParams.get('kind') || undefined) as 'note' | 'scratch' | undefined,
        search: url.searchParams.get('search') || undefined,
      }),
    })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const input = createNoteSchema.parse(await request.json())
    return NextResponse.json({ note: await createNote(input) }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? '입력값을 확인해 주세요.' }, { status: 422 })
    }
    return apiError(error)
  }
}
