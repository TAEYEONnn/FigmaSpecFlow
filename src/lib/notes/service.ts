import { getPayload, type Where } from 'payload'

import config from '@payload-config'
import { AppError } from '@/lib/api/response'
import { resolveRelationshipId } from '@/lib/access/relationships'
import { getAccessibleTeamIds, requireTeamMember } from '@/lib/access/team-scope'
import { requireProjectTeamCompatibility } from '@/lib/access/project-scope'
import { requireAuthContext } from '@/lib/auth/context'
import {
  createNoteSchema,
  updateNoteSchema,
  type CreateNoteInput,
  type UpdateNoteInput,
} from '@/lib/notes/schema'
import { createTask, type WorkspaceTaskView } from '@/lib/tasks/service'
import type { Note } from '@/payload-types'

export type WorkspaceNoteView = {
  id: string
  title: string | null
  content: string
  kind: 'note' | 'scratch'
  visibility: 'personal' | 'team'
  teamId: string | null
  projectId: string | null
  createdBy: string
  updatedBy: string
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export function noteRecordWhere(userId: string, teamIds: string[]): Where {
  const personal: Where = {
    and: [
      { visibility: { equals: 'personal' } },
      { createdBy: { equals: userId } },
    ],
  }
  if (teamIds.length === 0) return personal
  return {
    or: [
      personal,
      {
        and: [
          { visibility: { equals: 'team' } },
          { team: { in: teamIds } },
        ],
      },
    ],
  }
}

function mapNote(note: Note): WorkspaceNoteView {
  return {
    id: String(note.id),
    title: note.title ?? null,
    content: note.content ?? '',
    kind: note.kind,
    visibility: note.visibility,
    teamId: resolveRelationshipId(note.team),
    projectId: resolveRelationshipId(note.project),
    createdBy: resolveRelationshipId(note.createdBy) ?? '',
    updatedBy: resolveRelationshipId(note.updatedBy) ?? '',
    pinned: note.pinned ?? false,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }
}

async function accessibleNote(id: string, userId: string): Promise<Note> {
  const payload = await getPayload({ config })
  const teamIds = await getAccessibleTeamIds(userId)
  const result = await payload.find({
    collection: 'notes',
    where: { and: [{ id: { equals: id } }, noteRecordWhere(userId, teamIds)] },
    limit: 1,
    depth: 0,
  })
  const note = result.docs[0]
  if (!note) throw new AppError('NOT_FOUND', '메모를 찾을 수 없습니다.')
  return note
}

export async function listNotes(query: {
  teamId?: string | null
  personal?: boolean
  kind?: 'note' | 'scratch'
  search?: string
} = {}): Promise<WorkspaceNoteView[]> {
  const auth = await requireAuthContext()
  const payload = await getPayload({ config })
  const teamIds = await getAccessibleTeamIds(auth.userId)
  if (query.teamId && !teamIds.includes(query.teamId)) {
    throw new AppError('FORBIDDEN', '팀 메모에 접근할 수 없습니다.')
  }
  const clauses: Where[] = [noteRecordWhere(auth.userId, teamIds)]
  if (query.teamId) clauses.push({ team: { equals: query.teamId } })
  if (query.personal) clauses.push({ visibility: { equals: 'personal' } })
  if (query.kind) clauses.push({ kind: { equals: query.kind } })
  if (query.search) {
    clauses.push({
      or: [
        { title: { contains: query.search } },
        { content: { contains: query.search } },
      ],
    })
  }
  const result = await payload.find({
    collection: 'notes',
    where: { and: clauses },
    sort: '-updatedAt',
    limit: 200,
    depth: 0,
  })
  return result.docs.map(mapNote)
}

export async function getNote(id: string): Promise<WorkspaceNoteView> {
  const auth = await requireAuthContext()
  return mapNote(await accessibleNote(id, auth.userId))
}

export async function createNote(input: CreateNoteInput): Promise<WorkspaceNoteView> {
  const auth = await requireAuthContext()
  const data = createNoteSchema.parse(input)
  const teamId = data.visibility === 'team' ? data.teamId ?? null : null
  if (teamId) await requireTeamMember(teamId, auth.userId)
  if (data.projectId) {
    await requireProjectTeamCompatibility(data.projectId, auth.userId, teamId)
  }
  const payload = await getPayload({ config })
  const note = await payload.create({
    collection: 'notes',
    data: {
      title: data.title,
      content: data.content,
      kind: data.kind,
      visibility: data.visibility,
      team: teamId,
      project: data.projectId,
      createdBy: auth.userId,
      updatedBy: auth.userId,
      pinned: data.pinned,
    },
    depth: 0,
  })
  return mapNote(note)
}

export async function updateNote(id: string, input: UpdateNoteInput): Promise<WorkspaceNoteView> {
  const auth = await requireAuthContext()
  const patch = updateNoteSchema.parse(input)
  const current = await accessibleNote(id, auth.userId)
  const visibility = patch.visibility ?? current.visibility
  const currentTeamId = resolveRelationshipId(current.team)
  const teamId = visibility === 'team'
    ? patch.teamId === undefined ? currentTeamId : patch.teamId
    : null
  if (visibility === 'team' && !teamId) {
    throw new AppError('VALIDATION', '공유 메모에는 팀이 필요합니다.')
  }
  if (teamId) await requireTeamMember(teamId, auth.userId)
  if (patch.projectId) {
    await requireProjectTeamCompatibility(patch.projectId, auth.userId, teamId)
  }
  const { teamId: _teamId, projectId, ...fields } = patch
  const payload = await getPayload({ config })
  const updated = await payload.update({
    collection: 'notes',
    id,
    data: {
      ...fields,
      team: teamId,
      ...(projectId !== undefined ? { project: projectId } : {}),
      updatedBy: auth.userId,
    },
    depth: 0,
  })
  return mapNote(updated)
}

export async function deleteNote(id: string): Promise<void> {
  const auth = await requireAuthContext()
  await accessibleNote(id, auth.userId)
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'notes', id })
}

export async function convertScratchToNote(id: string): Promise<WorkspaceNoteView> {
  const auth = await requireAuthContext()
  const current = await accessibleNote(id, auth.userId)
  if (current.kind !== 'scratch') throw new AppError('VALIDATION', '낙서만 메모로 전환할 수 있습니다.')
  const payload = await getPayload({ config })
  const updated = await payload.update({
    collection: 'notes',
    id,
    data: {
      kind: 'note',
      title: current.title || (current.content ?? '').split('\n')[0].slice(0, 80) || '새 메모',
      updatedBy: auth.userId,
    },
    depth: 0,
  })
  return mapNote(updated)
}

export async function convertScratchToTask(id: string): Promise<WorkspaceTaskView> {
  const auth = await requireAuthContext()
  const current = await accessibleNote(id, auth.userId)
  if (current.kind !== 'scratch') throw new AppError('VALIDATION', '낙서만 할 일로 전환할 수 있습니다.')
  const content = (current.content ?? '').trim()
  if (!content) throw new AppError('VALIDATION', '빈 낙서는 할 일로 전환할 수 없습니다.')
  const teamId = current.visibility === 'team' ? resolveRelationshipId(current.team) : null
  const task = await createTask({
    title: (current.title || content.split('\n')[0]).slice(0, 200),
    description: content,
    isPersonal: current.visibility === 'personal',
    teamId,
    projectId: resolveRelationshipId(current.project),
    assigneeId: current.visibility === 'personal' ? auth.userId : null,
    status: 'todo',
    priority: 'medium',
  })
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'notes', id })
  return task
}
