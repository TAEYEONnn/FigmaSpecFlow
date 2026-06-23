import { randomUUID } from 'node:crypto'
import { getPayload } from 'payload'
import config from '@payload-config'
import { requireAuthContext } from '@/lib/auth/context'

async function getPayloadClient() {
  return getPayload({ config })
}

export type TeamRole = 'owner' | 'admin' | 'member'

export type TeamView = {
  id: string
  name: string
  ownerId: string
  myRole: TeamRole
}

export type TeamMemberView = {
  id: string
  userId: string
  email: string
  role: TeamRole
}

export type InvitationView = {
  id: string
  token: string
  email: string
  role: TeamRole
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

/** Returns the caller's role in a team, or null if not a member. */
async function getMyRole(teamId: string): Promise<TeamRole | null> {
  const auth = await requireAuthContext()
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'team-members',
    where: { and: [{ team: { equals: teamId } }, { user: { equals: auth.userId } }] },
    limit: 1,
  })
  if (result.totalDocs === 0) return null
  return (result.docs[0].role ?? 'member') as TeamRole
}

/** Returns true if caller is owner or admin. */
async function assertManager(teamId: string, errorMsg: string): Promise<void> {
  const role = await getMyRole(teamId)
  if (role !== 'owner' && role !== 'admin') throw new Error(errorMsg)
}

/** Returns true only if caller is owner. */
async function assertOwner(teamId: string): Promise<void> {
  const role = await getMyRole(teamId)
  if (role !== 'owner') throw new Error('팀 소유자만 이 작업을 수행할 수 있습니다.')
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
  await assertManager(teamId, '팀 소유자 또는 관리자만 이름을 변경할 수 있습니다.')
  const payload = await getPayloadClient()
  await payload.update({ collection: 'teams', id: teamId, data: { name } })
}

export async function deleteTeam(teamId: string): Promise<void> {
  await assertOwner(teamId)
  const payload = await getPayloadClient()

  // Cascade: delete all member records
  const members = await payload.find({
    collection: 'team-members',
    where: { team: { equals: teamId } },
    limit: 500,
  })
  await Promise.all(members.docs.map((m) => payload.delete({ collection: 'team-members', id: String(m.id) })))

  // Cascade: delete all invitations
  const invitations = await payload.find({
    collection: 'team-invitations',
    where: { team: { equals: teamId } },
    limit: 500,
  })
  await Promise.all(invitations.docs.map((inv) => payload.delete({ collection: 'team-invitations', id: String(inv.id) })))

  // Detach projects from the team (keep projects, unset team reference)
  const projects = await payload.find({
    collection: 'projects',
    where: { team: { equals: teamId } },
    limit: 500,
  })
  await Promise.all(projects.docs.map((p) => payload.update({
    collection: 'projects',
    id: String(p.id),
    data: { team: null as unknown as string },
  })))

  // Delete the team record
  await payload.delete({ collection: 'teams', id: teamId })
}

export async function leaveTeam(teamId: string): Promise<void> {
  const auth = await requireAuthContext()
  const role = await getMyRole(teamId)
  if (role === null) throw new Error('팀에 속해 있지 않아요.')
  if (role === 'owner') throw new Error('소유자는 바로 팀을 나갈 수 없어요. 먼저 소유권을 이전해 주세요.')

  const payload = await getPayloadClient()
  const memberRecord = await payload.find({
    collection: 'team-members',
    where: { and: [{ team: { equals: teamId } }, { user: { equals: auth.userId } }] },
    limit: 1,
  })
  if (memberRecord.totalDocs === 0) throw new Error('멤버 정보를 찾을 수 없어요.')
  await payload.delete({ collection: 'team-members', id: String(memberRecord.docs[0].id) })
}

export async function transferOwnership(teamId: string, toUserId: string): Promise<void> {
  const auth = await requireAuthContext()
  await assertOwner(teamId)
  if (toUserId === auth.userId) throw new Error('자기 자신에게 소유권을 이전할 수 없어요.')

  const payload = await getPayloadClient()

  // Verify target is a current team member
  const targetMember = await payload.find({
    collection: 'team-members',
    where: { and: [{ team: { equals: teamId } }, { user: { equals: toUserId } }] },
    limit: 1,
  })
  if (targetMember.totalDocs === 0) throw new Error('대상 사용자는 팀 멤버여야 해요.')

  // Find current owner's member record
  const ownerMember = await payload.find({
    collection: 'team-members',
    where: { and: [{ team: { equals: teamId } }, { user: { equals: auth.userId } }, { role: { equals: 'owner' } }] },
    limit: 1,
  })

  await Promise.all([
    // Demote current owner to admin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload.update({ collection: 'team-members', id: String(ownerMember.docs[0].id), data: { role: 'admin' as any } }),
    // Promote new owner
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload.update({ collection: 'team-members', id: String(targetMember.docs[0].id), data: { role: 'owner' as any } }),
    // Update Teams.owner field
    payload.update({ collection: 'teams', id: teamId, data: { owner: toUserId } }),
  ])
}

export async function changeMemberRole(teamId: string, userId: string, newRole: 'admin' | 'member'): Promise<void> {
  const auth = await requireAuthContext()
  await assertOwner(teamId)
  if (userId === auth.userId) throw new Error('자기 자신의 역할은 변경할 수 없어요.')

  const payload = await getPayloadClient()
  const memberRecord = await payload.find({
    collection: 'team-members',
    where: { and: [{ team: { equals: teamId } }, { user: { equals: userId } }] },
    limit: 1,
  })
  if (memberRecord.totalDocs === 0) throw new Error('멤버를 찾을 수 없어요.')
  const currentRole = memberRecord.docs[0].role as TeamRole
  if (currentRole === 'owner') throw new Error('소유자의 역할은 소유권 이전을 통해 변경할 수 있어요.')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await payload.update({ collection: 'team-members', id: String(memberRecord.docs[0].id), data: { role: newRole as any } })
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
    myRole: (m.role ?? 'member') as TeamRole,
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
      role: (m.role ?? 'member') as TeamRole,
    })),
  }
}

export async function inviteMember(
  teamId: string,
  email: string,
  role: 'admin' | 'member' = 'member',
): Promise<{ token: string; email: string; expiresAt: string; id: string }> {
  await assertManager(teamId, '팀 소유자 또는 관리자만 초대할 수 있습니다.')
  const payload = await getPayloadClient()

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { team: teamId, email, invitedBy: (await requireAuthContext()).userId, role: role as any, token, status: 'pending', expiresAt },
  })

  return { token, email, expiresAt, id: String(inv.id) }
}

export async function cancelInvitation(invitationId: string): Promise<void> {
  const payload = await getPayloadClient()
  const inv = await payload.findByID({ collection: 'team-invitations', id: invitationId })
  const teamId = resolveId(inv.team)
  await assertManager(teamId, '팀 소유자 또는 관리자만 초대를 취소할 수 있습니다.')
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
    role: (inv.role ?? 'member') as TeamRole,
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { team: inv.teamId, user: auth.userId, role: inv.role as any },
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
  await assertManager(teamId, '팀 소유자 또는 관리자만 멤버를 제거할 수 있습니다.')
  if (userId === auth.userId) throw new Error('자기 자신은 제거할 수 없습니다.')

  const payload = await getPayloadClient()

  // Admins cannot remove the owner
  const myRole = await getMyRole(teamId)
  if (myRole === 'admin') {
    const targetMember = await payload.find({
      collection: 'team-members',
      where: { and: [{ team: { equals: teamId } }, { user: { equals: userId } }] },
      limit: 1,
    })
    if (targetMember.totalDocs > 0 && targetMember.docs[0].role === 'owner') {
      throw new Error('관리자는 소유자를 제거할 수 없습니다.')
    }
  }

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
    role: (inv.role ?? 'member') as TeamRole,
    token: inv.token ?? '',
    expiresAt: typeof inv.expiresAt === 'string' ? inv.expiresAt : '',
  }))
}
