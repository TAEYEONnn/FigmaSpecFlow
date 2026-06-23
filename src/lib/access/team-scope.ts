import { getPayload, type Where } from 'payload'

import config from '@payload-config'
import { resolveRelationshipId } from '@/lib/access/relationships'

export type TeamRole = 'owner' | 'admin' | 'member'

export function buildTeamMemberReadWhere(userId: string): Where {
  return { user: { equals: userId } }
}

export function buildWorkspaceReadWhere(userId: string, teamIds: string[]): Where {
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

export async function getTeamMembership(
  teamId: string,
  userId: string,
): Promise<TeamRole | null> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'team-members',
    where: {
      and: [
        { team: { equals: teamId } },
        { user: { equals: userId } },
      ],
    },
    limit: 1,
    depth: 0,
  })
  return result.docs[0]?.role as TeamRole | undefined ?? null
}

export async function requireTeamMember(
  teamId: string,
  userId: string,
): Promise<TeamRole> {
  const role = await getTeamMembership(teamId, userId)
  if (!role) throw new Error('TEAM_ACCESS_DENIED')
  return role
}

export async function requireTeamManager(
  teamId: string,
  userId: string,
): Promise<TeamRole> {
  const role = await requireTeamMember(teamId, userId)
  if (role !== 'owner' && role !== 'admin') throw new Error('TEAM_MANAGER_REQUIRED')
  return role
}

export async function getAccessibleTeamIds(userId: string): Promise<string[]> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'team-members',
    where: buildTeamMemberReadWhere(userId),
    limit: 100,
    depth: 0,
  })
  return result.docs
    .map((membership) => resolveRelationshipId(membership.team))
    .filter((teamId): teamId is string => Boolean(teamId))
}
