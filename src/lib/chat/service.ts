import { getPayload, type Where } from 'payload'
import config from '@payload-config'
import { requireAuthContext } from '@/lib/auth/context'

async function getPayloadClient() {
  return getPayload({ config })
}

export type ChatMessageView = {
  id: string
  teamId: string
  content: string
  authorId: string
  authorEmail: string
  parentMessageId: string | null
  reactions: { emoji: string; userIds: string[] }[]
  createdAt: string
  updatedAt: string
}

export type CreateMessageData = {
  teamId: string
  content: string
  parentMessageId?: string
}

function resolveId(rel: unknown): string {
  if (rel && typeof rel === 'object' && 'id' in rel) return String((rel as { id: unknown }).id)
  return String(rel)
}

function resolveField(rel: unknown, field: string): string {
  if (rel && typeof rel === 'object' && field in rel)
    return String((rel as Record<string, unknown>)[field] ?? '')
  return ''
}

/** Verify caller is a member of the team; throws if not. */
async function assertTeamMember(teamId: string): Promise<void> {
  const auth = await requireAuthContext()
  const payload = await getPayloadClient()

  const result = await payload.find({
    collection: 'team-members',
    where: { and: [{ team: { equals: teamId } }, { user: { equals: auth.userId } }] },
    limit: 1,
  })
  if (result.totalDocs === 0) throw new Error('팀 멤버만 이 작업을 수행할 수 있습니다.')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMessage(doc: any): ChatMessageView {
  const rawReactions = Array.isArray(doc.reactions) ? doc.reactions : []
  const reactions = rawReactions.map((r: { emoji: string; users?: unknown[] }) => ({
    emoji: r.emoji ?? '',
    userIds: Array.isArray(r.users) ? r.users.map((u) => resolveId(u)) : [],
  }))

  return {
    id: String(doc.id),
    teamId: resolveId(doc.team),
    content: doc.content ?? '',
    authorId: resolveId(doc.author),
    authorEmail: resolveField(doc.author, 'email'),
    parentMessageId: doc.parentMessage ? resolveId(doc.parentMessage) : null,
    reactions,
    createdAt: typeof doc.createdAt === 'string' ? doc.createdAt : '',
    updatedAt: typeof doc.updatedAt === 'string' ? doc.updatedAt : '',
  }
}

export async function listMessages(
  teamId: string,
  options: { limit?: number; before?: string } = {},
): Promise<ChatMessageView[]> {
  await assertTeamMember(teamId)
  const payload = await getPayloadClient()

  const where: Where[] = [{ team: { equals: teamId } }]
  if (options.before) {
    const ref = await payload.findByID({ collection: 'chat-messages', id: options.before })
    where.push({ createdAt: { less_than: ref.createdAt } })
  }

  const result = await payload.find({
    collection: 'chat-messages',
    where: { and: where },
    sort: '-createdAt',
    limit: options.limit ?? 50,
    depth: 1,
  })

  return result.docs.map(mapMessage)
}

export async function createMessage(data: CreateMessageData): Promise<ChatMessageView> {
  const auth = await requireAuthContext()
  await assertTeamMember(data.teamId)
  const payload = await getPayloadClient()

  const doc = await payload.create({
    collection: 'chat-messages',
    data: {
      team: data.teamId,
      content: data.content,
      author: auth.userId,
      ...(data.parentMessageId ? { parentMessage: data.parentMessageId } : {}),
      reactions: [],
    },
    depth: 1,
  })

  return mapMessage(doc)
}

export async function updateMessage(messageId: string, content: string): Promise<ChatMessageView> {
  const auth = await requireAuthContext()
  const payload = await getPayloadClient()

  const existing = await payload.findByID({ collection: 'chat-messages', id: messageId, depth: 0 })
  if (resolveId(existing.author) !== auth.userId) throw new Error('자신이 작성한 메시지만 수정할 수 있습니다.')

  const doc = await payload.update({
    collection: 'chat-messages',
    id: messageId,
    data: { content },
    depth: 1,
  })

  return mapMessage(doc)
}

export async function deleteMessage(messageId: string): Promise<void> {
  const auth = await requireAuthContext()
  const payload = await getPayloadClient()

  const existing = await payload.findByID({ collection: 'chat-messages', id: messageId, depth: 0 })
  if (resolveId(existing.author) !== auth.userId) throw new Error('자신이 작성한 메시지만 삭제할 수 있습니다.')

  await payload.delete({ collection: 'chat-messages', id: messageId })
}

export async function addReaction(messageId: string, emoji: string): Promise<ChatMessageView> {
  const auth = await requireAuthContext()
  const payload = await getPayloadClient()

  const existing = await payload.findByID({ collection: 'chat-messages', id: messageId, depth: 0 })
  const teamId = resolveId(existing.team)
  await assertTeamMember(teamId)

  const rawReactions: Array<{
    emoji?: string | null
    count?: number | null
    users?: Array<{ userId?: string | null; id?: string | null }> | null
    id?: string | null
  }> = Array.isArray(existing.reactions)
    ? existing.reactions
    : []

  const idx = rawReactions.findIndex((r) => r.emoji === emoji)
  if (idx >= 0) {
    const users: string[] = Array.isArray(rawReactions[idx].users)
      ? rawReactions[idx].users.map((u) => u.userId ?? '').filter(Boolean)
      : []
    if (!users.includes(auth.userId)) {
      rawReactions[idx] = {
        ...rawReactions[idx],
        users: [...users, auth.userId].map((userId) => ({ userId })),
      }
    }
  } else {
    rawReactions.push({ emoji, users: [{ userId: auth.userId }] })
  }

  const doc = await payload.update({
    collection: 'chat-messages',
    id: messageId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { reactions: rawReactions as any },
    depth: 1,
  })

  return mapMessage(doc)
}
