import type { Access, CollectionConfig, Where } from 'payload'
import { resolveRelationshipId } from '@/lib/access/relationships'

async function projectTeamIds(req: Parameters<Access>[0]['req'], userId: string): Promise<string[]> {
  const result = await req.payload.find({
    collection: 'team-members',
    where: { user: { equals: userId } },
    limit: 100,
    depth: 0,
    req,
  })
  return result.docs
    .map((m) => resolveRelationshipId(m.team))
    .filter((id): id is string => Boolean(id))
}

const projectRead: Access = async ({ req }) => {
  if (!req.user || req.user.collection !== 'accounts') return false
  const userId = String(req.user.id)
  const teamIds = await projectTeamIds(req, userId)
  const where: Where = teamIds.length === 0
    ? { 'project.owner': { equals: userId } }
    : { or: [{ 'project.owner': { equals: userId } }, { 'project.team': { in: teamIds } }] }
  return where
}

export const CompilationRuns: CollectionConfig = {
  slug: 'compilation-runs',
  timestamps: true,
  access: {
    create: ({ req }) => Boolean(req.user),
    read: projectRead,
    update: ({ req }) => {
      if (!req.user) return false
      return { 'project.owner': { equals: req.user.id } }
    },
    delete: ({ req }) => {
      if (!req.user) return false
      return { 'project.owner': { equals: req.user.id } }
    },
  },
  fields: [
    {
      name: 'project',
      type: 'relationship',
      relationTo: 'projects',
      required: true,
      index: true,
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'accounts',
      index: true,
      admin: {
        hidden: true,
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        { label: 'Queued', value: 'queued' },
        { label: 'Running', value: 'running' },
        { label: 'Completed', value: 'completed' },
        { label: 'Failed', value: 'failed' },
      ],
    },
    {
      name: 'model',
      type: 'text',
    },
    {
      name: 'promptVersion',
      type: 'text',
    },
    {
      name: 'durationMs',
      type: 'number',
    },
    {
      name: 'errorCode',
      type: 'text',
    },
    {
      name: 'errorMessage',
      type: 'text',
    },
    {
      name: 'output',
      type: 'json',
    },
    {
      name: 'finishedAt',
      type: 'date',
    },
  ],
}
