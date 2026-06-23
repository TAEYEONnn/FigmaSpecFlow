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

export const Sources: CollectionConfig = {
  slug: 'sources',
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
      name: 'name',
      type: 'text',
    },
    {
      name: 'sourceType',
      type: 'select',
      options: [
        { label: 'Paste', value: 'paste' },
        { label: 'TXT', value: 'txt' },
        { label: 'MD', value: 'md' },
        { label: 'PDF', value: 'pdf' },
      ],
    },
    {
      name: 'content',
      type: 'textarea',
    },
    {
      name: 'sizeBytes',
      type: 'number',
    },
  ],
}
