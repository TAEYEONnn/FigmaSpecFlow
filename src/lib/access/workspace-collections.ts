import type { Access, PayloadRequest, Where } from 'payload'

import { resolveRelationshipId } from '@/lib/access/relationships'
import { buildWorkspaceReadWhere } from '@/lib/access/team-scope'

function accountId(req: PayloadRequest): string | null {
  if (!req.user || req.user.collection !== 'accounts') return null
  return String(req.user.id)
}

async function teamIds(req: PayloadRequest, userId: string): Promise<string[]> {
  const result = await req.payload.find({
    collection: 'team-members',
    where: { user: { equals: userId } },
    limit: 100,
    depth: 0,
    req,
  })
  return result.docs
    .map((membership) => resolveRelationshipId(membership.team))
    .filter((teamId): teamId is string => Boolean(teamId))
}

const taskRead: Access = async ({ req }) => {
  const userId = accountId(req)
  if (!userId) return false
  return buildWorkspaceReadWhere(userId, await teamIds(req, userId))
}

const noteRead: Access = async ({ req }) => {
  const userId = accountId(req)
  if (!userId) return false
  const accessibleTeams = await teamIds(req, userId)
  const personal: Where = {
    and: [
      { visibility: { equals: 'personal' } },
      { createdBy: { equals: userId } },
    ],
  }
  if (accessibleTeams.length === 0) return personal
  return {
    or: [
      personal,
      {
        and: [
          { visibility: { equals: 'team' } },
          { team: { in: accessibleTeams } },
        ],
      },
    ],
  }
}

const chatRead: Access = async ({ req }) => {
  const userId = accountId(req)
  if (!userId) return false
  return { team: { in: await teamIds(req, userId) } }
}

const authenticatedAccount: Access = ({ req }) => Boolean(accountId(req))
const authorOnly: Access = ({ req }) => {
  const userId = accountId(req)
  return userId ? { author: { equals: userId } } : false
}

export const taskAccess = {
  create: authenticatedAccount,
  read: taskRead,
  update: taskRead,
  delete: taskRead,
}

export const noteAccess = {
  create: authenticatedAccount,
  read: noteRead,
  update: noteRead,
  delete: noteRead,
}

export const chatMessageAccess = {
  create: authenticatedAccount,
  read: chatRead,
  update: authorOnly,
  delete: authorOnly,
}
