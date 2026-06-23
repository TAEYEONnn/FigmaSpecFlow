import { getPayload, type Where } from 'payload'

import config from '@payload-config'
import { AppError } from '@/lib/api/response'
import { resolveRelationshipId } from '@/lib/access/relationships'
import { getAccessibleTeamIds, requireTeamMember } from '@/lib/access/team-scope'
import { requireProjectTeamCompatibility } from '@/lib/access/project-scope'
import { requireAuthContext } from '@/lib/auth/context'
import {
  createTaskSchema,
  updateTaskSchema,
  type CreateTaskInput,
  type UpdateTaskInput,
} from '@/lib/tasks/schema'
import type { Task } from '@/payload-types'

export type WorkspaceTaskView = {
  id: string
  title: string
  description: string | null
  status: 'todo' | 'inProgress' | 'done'
  priority: 'low' | 'medium' | 'high'
  dueDate: string | null
  isPersonal: boolean
  teamId: string | null
  projectId: string | null
  assigneeId: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export function taskRecordWhere(userId: string, teamIds: string[]): Where {
  const personal: Where = {
    and: [
      { isPersonal: { equals: true } },
      { createdBy: { equals: userId } },
    ],
  }
  if (teamIds.length === 0) return personal
  return {
    or: [
      personal,
      {
        and: [
          { isPersonal: { equals: false } },
          { team: { in: teamIds } },
        ],
      },
    ],
  }
}

function mapTask(task: Task): WorkspaceTaskView {
  return {
    id: String(task.id),
    title: task.title,
    description: task.description ?? null,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ?? null,
    isPersonal: task.isPersonal,
    teamId: resolveRelationshipId(task.team),
    projectId: resolveRelationshipId(task.project),
    assigneeId: resolveRelationshipId(task.assignee),
    createdBy: resolveRelationshipId(task.createdBy) ?? '',
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  }
}

async function accessibleTask(id: string, userId: string): Promise<Task> {
  const payload = await getPayload({ config })
  const teams = await getAccessibleTeamIds(userId)
  const result = await payload.find({
    collection: 'tasks',
    where: { and: [{ id: { equals: id } }, taskRecordWhere(userId, teams)] },
    limit: 1,
    depth: 0,
  })
  const task = result.docs[0]
  if (!task) throw new AppError('NOT_FOUND', '할 일을 찾을 수 없습니다.')
  return task
}

export async function listTasks(query: {
  teamId?: string | null
  personal?: boolean
  assignedToMe?: boolean
  status?: WorkspaceTaskView['status']
  search?: string
} = {}): Promise<WorkspaceTaskView[]> {
  const auth = await requireAuthContext()
  const payload = await getPayload({ config })
  const teams = await getAccessibleTeamIds(auth.userId)
  if (query.teamId && !teams.includes(query.teamId)) {
    throw new AppError('FORBIDDEN', '팀 할 일에 접근할 수 없습니다.')
  }
  const clauses: Where[] = [taskRecordWhere(auth.userId, teams)]
  if (query.teamId) clauses.push({ team: { equals: query.teamId } })
  if (query.personal === true) clauses.push({ isPersonal: { equals: true } })
  if (query.assignedToMe) clauses.push({ assignee: { equals: auth.userId } })
  if (query.status) clauses.push({ status: { equals: query.status } })
  if (query.search) clauses.push({ title: { contains: query.search } })
  const result = await payload.find({
    collection: 'tasks',
    where: { and: clauses },
    sort: '-updatedAt',
    limit: 200,
    depth: 0,
  })
  return result.docs.map(mapTask)
}

export async function createTask(input: CreateTaskInput): Promise<WorkspaceTaskView> {
  const auth = await requireAuthContext()
  const data = createTaskSchema.parse(input)
  const teamId = data.isPersonal ? null : data.teamId ?? null
  if (teamId) await requireTeamMember(teamId, auth.userId)
  if (data.assigneeId && teamId) await requireTeamMember(teamId, data.assigneeId)
  if (data.projectId) {
    await requireProjectTeamCompatibility(data.projectId, auth.userId, teamId)
  }
  const payload = await getPayload({ config })
  const task = await payload.create({
    collection: 'tasks',
    data: {
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      dueDate: data.dueDate,
      isPersonal: data.isPersonal,
      team: teamId,
      project: data.projectId,
      assignee: data.isPersonal ? auth.userId : data.assigneeId,
      createdBy: auth.userId,
    },
    depth: 0,
  })
  return mapTask(task)
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<WorkspaceTaskView> {
  const auth = await requireAuthContext()
  const patch = updateTaskSchema.parse(input)
  const current = await accessibleTask(id, auth.userId)
  const teamId = resolveRelationshipId(current.team)
  if (patch.assigneeId && teamId) await requireTeamMember(teamId, patch.assigneeId)
  if (patch.projectId) {
    await requireProjectTeamCompatibility(patch.projectId, auth.userId, teamId)
  }
  const { projectId, assigneeId, ...fields } = patch
  const payload = await getPayload({ config })
  const updated = await payload.update({
    collection: 'tasks',
    id,
    data: {
      ...fields,
      ...(projectId !== undefined ? { project: projectId } : {}),
      ...(assigneeId !== undefined ? { assignee: assigneeId } : {}),
    },
    depth: 0,
  })
  return mapTask(updated)
}

export async function deleteTask(id: string): Promise<void> {
  const auth = await requireAuthContext()
  await accessibleTask(id, auth.userId)
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'tasks', id })
}
