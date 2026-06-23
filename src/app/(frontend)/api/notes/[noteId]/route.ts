import { NextResponse } from 'next/server'
import { z } from 'zod'

import { apiError } from '@/lib/api/response'
import { updateNoteSchema } from '@/lib/notes/schema'
import { deleteNote, getNote, updateNote } from '@/lib/notes/service'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ noteId: string }> },
) {
  try {
    const { noteId } = await params
    return NextResponse.json({ note: await getNote(noteId) })
  } catch (error) {
    return apiError(error)
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ noteId: string }> },
) {
  try {
    const { noteId } = await params
    return NextResponse.json({
      note: await updateNote(noteId, updateNoteSchema.parse(await request.json())),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '입력값을 확인해 주세요.' }, { status: 422 })
    }
    return apiError(error)
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ noteId: string }> },
) {
  try {
    const { noteId } = await params
    await deleteNote(noteId)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return apiError(error)
  }
}
