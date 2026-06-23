import { randomUUID } from 'node:crypto'
import { getPayload } from 'payload'
import config from '@payload-config'
import { requireAuthContext } from '@/lib/auth/context'

async function getPayloadClient() {
  return getPayload({ config })
}

export type TeamView = {
  id: string
  name: string
  ownerId: string
  myRole: 'owner' | 'member'
}

export type TeamMemberView = {
  id: string
  userId: string
  email: string
  role: 'owner' | 'member'
}

export type InvitationView = {
  id: string
  token: string
  email: string
  role: 'owner' | 'member'
  status: 'pending' | 'accepted' | 'rejected'
  expiresAt: string
  teamId: string
  teamName: string
}

function resolveId(rel: unknown): string {
  if (rel && typeof rel === 'object' && 'id' in rel) return String((rel as { id: unknown }).id)
  return String(rel)
}

function resolveField(rel: unknown, field: string): string {
  if (rel && typeof rel === 'object' && field in rel) return String((rel as Record<string, unknown>)[field] ?? '')
  return ''
}

export async function createTeam(name: string): Promise<TeamView> {
  const auth = await requireAuthContext()
  const payload = await getPayloadClient()

  const team = await payload.create({
    collection: 'teams',
    data: { name, owner: auth.userId },
  })

  await payload.create({
    collection: 'team-members',
    data: { team: String(team.id), user: auth.userId, role: 'owner' },
  })

  return { id: String(team.id), name: team.name, ownerId: auth.userId, myRole: 'owner' }
}

export async function renameTeam(teamId: string, name: string): Promise<void> {
  const auth = await requireAuthContext()
  const payload = await getPayloadClient()

  const ownerCheck = await payload.find({
    collection: 'team-members',
    where: { and: [{ team: { equals: teamId } }, { user: { equals: auth.userId } }, { role: { equals: 'owner' } }] },
    limit: 1,
  })
  if (ownerCheck.totalDocs === 0) throw new Error('팀 소유자만 이름을 변경할 수 있습니다.')

  await payload.update({ collection: 'teams', id: teamId, data: { name } })
}

export async function listMyTeams(): Promise<TeamView[]> {
  const auth = await requireAuthContext()
  const payload = await getPayloadClient()

  const result = await payload.find({
    collection: 'team-members',
    where: { user: { equals: auth.userId } },
    depth: 1,
    limit: 100,
  })

  return result.docs.map((m) => ({
    id: resolveId(m.team),
    name: resolveField(m.team, 'name'),
    ownerId: resolveField(m.team, 'owner'),
    myRole: (m.role ?? 'member') as 'owner' | 'member',
  }))
}

export async function getMyTeamIds(): Promise<string[]> {
  const auth = await requireAuthContext()
  const payload = await getPayloadClient()

  const result = await payload.find({
    collection: 'team-members',
    where: { user: { equals: auth.userId } },
    limit: 100,
  })

  return result.docs.map((m) => resolveId(m.team))
}

export async function getTeam(
  teamId: string,
): Promise<{ id: string; name: string; ownerId: string; members: TeamMemberView[] }> {
  const auth = await requireAuthContext()
  const payload = await getPayloadClient()

  const [team, members] = await Promise.all([
    payload.findByID({ collection: 'teams', id: teamId }),
    payload.find({
      collection: 'team-members',
      where: { team: { equals: teamId } },
      depth: 1,
      limit: 100,
    }),
  ])

  const isMember = members.docs.some((m) => resolveId(m.user) === auth.userId)
  if (!isMember) throw new Error('접근 권한이 없습니다.')

  return {
    id: String(team.id),
    name: team.name,
    ownerId: resolveId(team.owner),
    members: members.docs.map((m) => ({
      id: String(m.id),
      userId: resolveId(m.user),
      email: resolveField(m.user, 'email'),
      role: (m.role ?? 'member') as 'owner' | 'member',
    })),
  }
}

export async function inviteMember(
  teamId: string,
  email: string,
  role: 'owner' | 'member' = 'member',
): Promise<{ token: string; email: string; expiresAt: string; id: string }> {
  const auth = await requireAuthContext()
  const payload = await getPayloadClient()

  const ownerCheck = await payload.find({
    collection: 'team-members',
    where: { and: [{ team: { equals: teamId } }, { user: { equals: auth.userId } }, { role: { equals: 'owner' } }] },
    limit: 1,
  })
  if (ownerCheck.totalDocs === 0) throw new Error('팀 소유자만 초대할 수 있습니다.')

  // 가입된 계정인지 확인
  const account = await payload.find({
    collection: 'accounts',
    where: { email: { equals: email } },
    limit: 1,
  })
  if (account.totalDocs === 0) throw new Error('등록된 계정이 없는 이메일이에요. 먼저 가입을 안내해 주세요.')

  // 이미 팀 멤버인지 확인
  const alreadyMember = await payload.find({
    collection: 'team-members',
    where: { and: [{ team: { equals: teamId } }, { user: { equals: String(account.docs[0].id) } }] },
    limit: 1,
  })
  if (alreadyMember.totalDocs > 0) throw new Error('이미 팀 멤버인 사용자예요.')

  const existing = await payload.find({
    collection: 'team-invitations',
    where: { and: [{ team: { equals: teamId } }, { email: { equals: email } }, { status: { equals: 'pending' } }] },
    limit: 1,
  })
  if (existing.totalDocs > 0) throw new Error('이미 초대가 발송됐습니다.')

  const token = randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const inv = await payload.create({
    collection: 'team-invitations',
    data: { team: teamId, email, invitedBy: auth.userId, role, token, status: 'pending', expiresAt },
  })

  return { token, email, expiresAt, id: String(inv.id) }
}

export async function cancelInvitation(invitationId: string): Promise<void> {
  const auth = await requireAuthContext()
  const payload = await getPayloadClient()

  const inv = await payload.findByID({ collection: 'team-invitations', id: invitationId })
  const teamId = resolveId(inv.team)

  const ownerCheck = await payload.find({
    collection: 'team-members',
    where: { and: [{ team: { equals: teamId } }, { user: { equals: auth.userId } }, { role: { equals: 'owner' } }] },
    limit: 1,
  })
  if (ownerCheck.totalDocs === 0) throw new Error('팀 소유자만 초대를 취소할 수 있습니다.')

  await payload.delete({ collection: 'team-invitations', id: invitationId })
}

export async function getInvitation(token: string): Promise<InvitationView> {
  const payload = await getPayloadClient()

  const result = await payload.find({
    collection: 'team-invitations',
    where: { token: { equals: token } },
    depth: 1,
    limit: 1,
  })
  if (result.totalDocs === 0) throw new Error('초대를 찾을 수 없습니다.')

  const inv = result.docs[0]
  return {
    id: String(inv.id),
    token: inv.token ?? '',
    email: inv.email,
    status: (inv.status ?? 'pending') as 'pending' | 'accepted' | 'rejected',
    role: (inv.role ?? 'member') as 'owner' | 'member',
    expiresAt: typeof inv.expiresAt === 'string' ? inv.expiresAt : '',
    teamId: resolveId(inv.team),
    teamName: resolveField(inv.team, 'name'),
  }
}

export async function acceptInvitation(token: string): Promise<{ teamId: string; teamName: string }> {
  const auth = await requireAuthContext()
  const payload = await getPayloadClient()

  const inv = await getInvitation(token)
  if (inv.status !== 'pending') throw new Error('이미 처리된 초대입니다.')
  if (new Date(inv.expiresAt) < new Date()) throw new Error('초대가 만료됐습니다.')

  await payload.update({
    collection: 'team-invitations',
    id: inv.id,
    data: { status: 'accepted' },
  })

  const existing = await payload.find({
    collection: 'team-members',
    where: { and: [{ team: { equals: inv.teamId } }, { user: { equals: auth.userId } }] },
    limit: 1,
  })

  if (existing.totalDocs === 0) {
    await payload.create({
      collection: 'team-members',
      data: { team: inv.teamId, user: auth.userId, role: inv.role },
    })
  }

  return { teamId: inv.teamId, teamName: inv.teamName }
}

export async function rejectInvitation(token: string): Promise<void> {
  const payload = await getPayloadClient()

  const inv = await getInvitation(token)
  if (inv.status !== 'pending') throw new Error('이미 처리된 초대입니다.')

  await payload.update({
    collection: 'team-invitations',
    id: inv.id,
    data: { status: 'rejected' },
  })
}

export async function removeMember(teamId: string, userId: string): Promise<void> {
  const auth = await requireAuthContext()
  const payload = await getPayloadClient()

  const ownerCheck = await payload.find({
    collection: 'team-members',
    where: { and: [{ team: { equals: teamId } }, { user: { equals: auth.userId } }, { role: { equals: 'owner' } }] },
    limit: 1,
  })
  if (ownerCheck.totalDocs === 0) throw new Error('팀 소유자만 멤버를 제거할 수 있습니다.')
  if (userId === auth.userId) throw new Error('자기 자신은 제거할 수 없습니다.')

  const memberRecord = await payload.find({
    collection: 'team-members',
    where: { and: [{ team: { equals: teamId } }, { user: { equals: userId } }] },
    limit: 1,
  })
  if (memberRecord.totalDocs === 0) throw new Error('멤버를 찾을 수 없습니다.')

  await payload.delete({ collection: 'team-members', id: String(memberRecord.docs[0].id) })
}

export async function listPendingInvitations(teamId: string) {
  await getTeam(teamId) // auth + membership check

  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'team-invitations',
    where: { and: [{ team: { equals: teamId } }, { status: { equals: 'pending' } }] },
    limit: 100,
  })

  return result.docs.map((inv) => ({
    id: String(inv.id),
    email: inv.email,
    role: (inv.role ?? 'member') as 'owner' | 'member',
    token: inv.token ?? '',
    expiresAt: typeof inv.expiresAt === 'string' ? inv.expiresAt : '',
  }))
}
