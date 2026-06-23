import { getPayload } from 'payload'

import config from '@payload-config'
import type { Project } from '@/payload-types'
import { resolveRelationshipId } from '@/lib/access/relationships'
import { getAccessibleTeamIds } from '@/lib/access/team-scope'

export async function requireProjectAccess(
  projectId: string,
  userId: string,
): Promise<Project> {
  const payload = await getPayload({ config })
  const project = await payload.findByID({
    collection: 'projects',
    id: projectId,
    depth: 0,
  })
  const ownerId = resolveRelationshipId(project.owner)
  if (ownerId === userId) return project

  const teamId = resolveRelationshipId(project.team)
  const teamIds = await getAccessibleTeamIds(userId)
  if (teamId && teamIds.includes(teamId)) return project
  throw new Error('PROJECT_ACCESS_DENIED')
}

export async function requireProjectTeamCompatibility(
  projectId: string,
  userId: string,
  teamId: string | null,
): Promise<Project> {
  const project = await requireProjectAccess(projectId, userId)
  const projectTeamId = resolveRelationshipId(project.team)
  if (teamId && projectTeamId !== teamId) throw new Error('PROJECT_TEAM_MISMATCH')
  if (!teamId && projectTeamId && resolveRelationshipId(project.owner) !== userId) {
    throw new Error('PROJECT_TEAM_MISMATCH')
  }
  return project
}
