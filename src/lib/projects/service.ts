import { getPayload, type Where } from 'payload'
import config from '@payload-config'
import { COMPILER_PROMPT_VERSION } from '@/lib/ai/compiler'
import { requireAuthContext, type AuthContext } from '@/lib/auth/context'
import { getMyTeamIds } from '@/lib/teams/service'
import {
  addDemoSource,
  createDemoProject,
  createDemoRun,
  deleteDemoProject,
  deleteDemoSource,
  finishDemoRun,
  getDemoProject,
  listDemoProjects,
  renameDemoProject,
  saveDemoDocument,
  updateDemoSource,
  type DemoRun,
} from '@/lib/projects/demo-store'
import type { SpecDocument } from '@/lib/spec/schema'
import { parseStoredSpecDocument } from '@/lib/spec/stored-document'
import { assertRevision } from '@/lib/projects/revision'
import type { Project } from '@/payload-types'

export type ProjectView = {
  id: string
  name: string
  revision: number
  needsRecompile: boolean
  document: SpecDocument | null
  sources: Array<{
    id: string
    name: string
    type: 'paste' | 'txt' | 'md' | 'pdf'
    content: string
    createdAt: string
    updatedAt: string
  }>
  runs: DemoRun[]
  updatedAt: string
}

export type { DemoRun }

export type DocumentRevisionSummary = {
  revision: number
  createdAt: string
  runId: string | null
}

async function getPayloadClient() {
  return getPayload({ config })
}

export async function listProjects() {
  const auth = await requireAuthContext()
  if (auth.demo) return listDemoProjects()

  const payload = await getPayloadClient()
  const teamIds = await getMyTeamIds()
  const whereClause: Where = teamIds.length > 0
    ? { or: [{ owner: { equals: auth.userId } }, { team: { in: teamIds } }] }
    : { owner: { equals: auth.userId } }

  const result = await payload.find({
    collection: 'projects',
    where: whereClause,
    sort: '-updatedAt',
    depth: 1,
    limit: 100,
  })

  return result.docs.map((doc) => {
    const teamRel = doc.team as unknown
    const teamId = teamRel && typeof teamRel === 'object' && 'id' in teamRel
      ? String((teamRel as { id: unknown }).id) : null
    const teamName = teamRel && typeof teamRel === 'object' && 'name' in teamRel
      ? String((teamRel as { name: unknown }).name) : null
    return {
      id: String(doc.id),
      name: doc.name,
      revision: doc.revision ?? 0,
      needsRecompile: doc.needsRecompile ?? false,
      document: null,
      sources: [],
      runs: [],
      updatedAt: doc.updatedAt,
      teamId,
      teamName,
    }
  })
}

export async function createProject(name: string, teamId?: string) {
  const auth = await requireAuthContext()
  if (auth.demo) return createDemoProject(name)

  const payload = await getPayloadClient()
  const doc = await payload.create({
    collection: 'projects',
    data: {
      name,
      owner: auth.userId,
      revision: 0,
      needsRecompile: false,
      ...(teamId ? { team: teamId } : {}),
    },
  })

  return {
    id: String(doc.id),
    name: doc.name,
    revision: doc.revision ?? 0,
    needsRecompile: false,
    document: null,
    sources: [],
    runs: [],
    updatedAt: doc.updatedAt,
  }
}

export async function getProject(
  projectId: string,
  providedAuth?: AuthContext,
): Promise<ProjectView | null> {
  const auth = providedAuth ?? (await requireAuthContext())
  if (auth.demo) return getDemoProject(projectId)

  const payload = await getPayloadClient()

  let project: Project
  try {
    project = await payload.findByID({
      collection: 'projects',
      id: projectId,
    })
  } catch {
    return null
  }
  if (!project) return null

  // Fetch document, sources, runs in parallel
  const [documentResult, sourceResult, runResult] = await Promise.all([
    project.currentDocument
      ? payload
          .findByID({
            collection: 'project-documents',
            id:
              typeof project.currentDocument === 'string'
                ? project.currentDocument
                : String(project.currentDocument.id),
          })
          .catch(() => null)
      : Promise.resolve(null),
    payload.find({
      collection: 'sources',
      where: { project: { equals: projectId } },
      sort: '-createdAt',
      limit: 100,
    }),
    payload.find({
      collection: 'compilation-runs',
      where: { project: { equals: projectId } },
      sort: '-createdAt',
      limit: 20,
    }),
  ])

  return {
    id: String(project.id),
    name: project.name,
    revision: project.revision ?? 0,
    needsRecompile: project.needsRecompile ?? false,
    document: documentResult?.document
      ? parseStoredSpecDocument(documentResult.document, String(project.id))
      : null,
    sources: sourceResult.docs.map((s) => ({
      id: String(s.id),
      name: s.name ?? '',
      type: (s.sourceType as 'paste' | 'txt' | 'md' | 'pdf') ?? 'paste',
      content: s.content ?? '',
      createdAt: s.createdAt,
      updatedAt: s.updatedAt ?? s.createdAt,
    })),
    runs: runResult.docs.map((r) => ({
      id: String(r.id),
      status: r.status as DemoRun['status'],
      model: r.model ?? '',
      promptVersion: r.promptVersion ?? '',
      durationMs: r.durationMs ?? undefined,
      errorCode: r.errorCode ?? undefined,
      errorMessage: r.errorMessage ?? undefined,
      createdAt: r.createdAt,
      finishedAt: r.finishedAt ?? undefined,
    })),
    updatedAt: project.updatedAt,
  }
}

export async function addSource(
  projectId: string,
  source: { name: string; type: 'paste' | 'txt' | 'md' | 'pdf'; content: string },
) {
  const auth = await requireAuthContext()
  if (auth.demo) return addDemoSource(projectId, source)

  const payload = await getPayloadClient()
  const doc = await payload.create({
    collection: 'sources',
    data: {
      project: projectId,
      user: auth.userId,
      name: source.name,
      sourceType: source.type,
      content: source.content,
      sizeBytes: new TextEncoder().encode(source.content).length,
    },
  })

  await markProjectNeedsRecompile(payload, projectId)

  return {
    id: String(doc.id),
    name: doc.name ?? '',
    type: (doc.sourceType as 'paste' | 'txt' | 'md' | 'pdf') ?? 'paste',
    content: doc.content ?? '',
    createdAt: doc.createdAt,
  }
}

export async function deleteSource(projectId: string, sourceId: string) {
  const auth = await requireAuthContext()
  if (auth.demo) {
    deleteDemoSource(projectId, sourceId)
    return
  }

  const payload = await getPayloadClient()
  await payload.delete({
    collection: 'sources',
    id: sourceId,
  })

  await markProjectNeedsRecompile(payload, projectId)
}

export async function updateSource(
  projectId: string,
  sourceId: string,
  patch: { name?: string; content?: string },
) {
  const auth = await requireAuthContext()
  if (auth.demo) return updateDemoSource(projectId, sourceId, patch)

  const payload = await getPayloadClient()
  const updates: Record<string, unknown> = {}
  if (patch.name !== undefined) updates.name = patch.name
  if (patch.content !== undefined) {
    updates.content = patch.content
    updates.sizeBytes = new TextEncoder().encode(patch.content).length
  }

  const doc = await payload.update({
    collection: 'sources',
    id: sourceId,
    data: updates,
  })

  if (patch.content !== undefined) {
    await markProjectNeedsRecompile(payload, projectId)
  }

  return {
    id: String(doc.id),
    name: doc.name ?? '',
    type: (doc.sourceType as 'paste' | 'txt' | 'md' | 'pdf') ?? 'paste',
    content: doc.content ?? '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt ?? doc.createdAt,
  }
}

export async function createCompilationRun(projectId: string) {
  const auth = await requireAuthContext()
  if (auth.demo) return createDemoRun(projectId)

  const payload = await getPayloadClient()
  const doc = await payload.create({
    collection: 'compilation-runs',
    data: {
      project: projectId,
      user: auth.userId,
      status: 'running',
      model: process.env.OPENAI_MODEL ?? 'gpt-5.4-mini',
      promptVersion: COMPILER_PROMPT_VERSION,
    },
  })

  return {
    id: String(doc.id),
    status: doc.status,
    model: doc.model ?? '',
    promptVersion: doc.promptVersion ?? '',
    createdAt: doc.createdAt,
  } as DemoRun
}

export async function finishCompilationRun(
  projectId: string,
  runId: string,
  update: Partial<DemoRun> & { output?: SpecDocument },
) {
  const auth = await requireAuthContext()
  if (auth.demo) return finishDemoRun(projectId, runId, update)

  const payload = await getPayloadClient()
  const { output, ...runUpdate } = update

  const doc = await payload.update({
    collection: 'compilation-runs',
    id: runId,
    data: {
      status: runUpdate.status,
      durationMs: runUpdate.durationMs,
      errorCode: runUpdate.errorCode,
      errorMessage: runUpdate.errorMessage,
      output: output ?? undefined,
      finishedAt: new Date().toISOString(),
    },
  })

  return doc
}

export async function saveProjectDocument(
  projectId: string,
  expectedRevision: number,
  document: SpecDocument,
  runId?: string,
) {
  const auth = await requireAuthContext()
  if (auth.demo) {
    return saveDemoDocument(projectId, expectedRevision, document, Boolean(runId))
  }

  const payload = await getPayloadClient()

  // Fetch project to check revision
  const project = await payload.findByID({
    collection: 'projects',
    id: projectId,
  })

  assertRevision(expectedRevision, project.revision ?? 0)

  const newRevision = (project.revision ?? 0) + 1

  // Create document record
  const docRecord = await payload.create({
    collection: 'project-documents',
    data: {
      project: projectId,
      user: auth.userId,
      revision: newRevision,
      document: document as unknown as Record<string, unknown>,
      sourceRun: runId ?? undefined,
    },
  })

  // Update project
  await payload.update({
    collection: 'projects',
    id: projectId,
    data: {
      revision: newRevision,
      currentDocument: String(docRecord.id),
      ...(runId ? { needsRecompile: false } : {}),
    },
  })

  return newRevision
}

export async function deleteProject(projectId: string) {
  const auth = await requireAuthContext()
  if (auth.demo) {
    deleteDemoProject(projectId)
    return
  }

  const payload = await getPayloadClient()
  await payload.delete({
    collection: 'projects',
    id: projectId,
  })
}

export async function renameProject(projectId: string, name: string) {
  const auth = await requireAuthContext()
  if (auth.demo) {
    renameDemoProject(projectId, name)
    return
  }

  const payload = await getPayloadClient()
  await payload.update({
    collection: 'projects',
    id: projectId,
    data: { name },
  })
}

export async function getCompilationRun(projectId: string, runId: string) {
  const project = await getProject(projectId)
  return project?.runs.find((run) => run.id === runId) ?? null
}

export async function getDocumentAtRevision(
  projectId: string,
  revision: number,
): Promise<SpecDocument | null> {
  const auth = await requireAuthContext()
  if (auth.demo) {
    const project = getDemoProject(projectId)
    if (!project) return null
    return revision === project.revision ? project.document : null
  }

  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'project-documents',
    where: {
      project: { equals: projectId },
      revision: { equals: revision },
    },
    limit: 1,
  })

  if (result.docs.length === 0) return null
  return (result.docs[0].document as SpecDocument | undefined) ?? null
}

export async function listDocumentRevisions(
  projectId: string,
): Promise<DocumentRevisionSummary[]> {
  const auth = await requireAuthContext()
  if (auth.demo) {
    const project = getDemoProject(projectId)
    if (!project || project.revision === 0) return []
    return [{ revision: project.revision, createdAt: project.updatedAt, runId: null }]
  }

  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'project-documents',
    where: { project: { equals: projectId } },
    sort: '-revision',
    limit: 20,
  })

  return result.docs.map((doc) => ({
    revision: doc.revision,
    createdAt: doc.createdAt,
    runId: doc.sourceRun
      ? typeof doc.sourceRun === 'string'
        ? doc.sourceRun
        : String(doc.sourceRun.id)
      : null,
  }))
}

async function markProjectNeedsRecompile(
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  projectId: string,
) {
  await payload.update({
    collection: 'projects',
    id: projectId,
    data: { needsRecompile: true },
  })
}

export async function archiveProject(projectId: string) {
  const auth = await requireAuthContext()
  if (auth.demo) return
  const payload = await getPayloadClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await payload.update({ collection: 'projects', id: projectId, data: { archived: true } as any })
}

export async function unarchiveProject(projectId: string) {
  const auth = await requireAuthContext()
  if (auth.demo) return
  const payload = await getPayloadClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await payload.update({ collection: 'projects', id: projectId, data: { archived: false } as any })
}

export async function moveProject(projectId: string, toTeamId: string | null) {
  const auth = await requireAuthContext()
  if (auth.demo) return
  const payload = await getPayloadClient()

  // Verify user owns the project
  const project = await payload.findByID({ collection: 'projects', id: projectId })
  const ownerId = project.owner && typeof project.owner === 'object' && 'id' in project.owner
    ? String((project.owner as { id: unknown }).id)
    : String(project.owner)
  if (ownerId !== auth.userId) throw new Error('프로젝트 소유자만 팀을 변경할 수 있어요.')

  if (toTeamId) {
    // Verify user is member of target team
    const { getMyTeamIds } = await import('@/lib/teams/service')
    const myTeamIds = await getMyTeamIds()
    if (!myTeamIds.includes(toTeamId)) throw new Error('대상 팀의 멤버가 아니에요.')
  }

  await payload.update({
    collection: 'projects',
    id: projectId,
    data: { team: toTeamId as unknown as string },
  })
}

export async function listTeamProjects(teamId: string) {
  const auth = await requireAuthContext()
  if (auth.demo) return []
  const payload = await getPayloadClient()

  // Verify membership
  const { getMyTeamIds } = await import('@/lib/teams/service')
  const myTeamIds = await getMyTeamIds()
  if (!myTeamIds.includes(teamId)) throw new Error('접근 권한이 없습니다.')

  const result = await payload.find({
    collection: 'projects',
    where: { team: { equals: teamId } },
    sort: '-updatedAt',
    depth: 1,
    limit: 100,
  })

  return result.docs.map((doc) => ({
    id: String(doc.id),
    name: doc.name,
    revision: doc.revision ?? 0,
    needsRecompile: doc.needsRecompile ?? false,
    archived: (doc as unknown as Record<string, unknown>).archived === true,
    document: null,
    sources: [],
    runs: [],
    updatedAt: doc.updatedAt,
    teamId,
  }))
}
