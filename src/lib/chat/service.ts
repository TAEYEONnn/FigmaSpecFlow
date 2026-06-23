import { getPayload, type Where } from 'payload'
import config from '@payload-config'
import { requireAuthContext } from '@/lib/auth/context'
import { AppError } from '@/lib/api/response'
import { requireTeamMember } from '@/lib/access/team-scope'
import { resolveRelationshipId } from '@/lib/access/relationships'
import {
  createMessageSchema,
  reactionSchema,
  updateMessageSchema,
} from '@/lib/chat/schema'
import type { ChatMessage } from '@/payload-types'

async function getPayloadClient() {
  return getPayload({ config })
}

export type ChatMessageView = {
  id: string
  teamId: string
  content: string
  authorId: string
  authorEmail: string
  authorName: string
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

async function assertTeamMember(teamId: string): Promise<void> {
  const auth = await requireAuthContext()
  try {
    await requireTeamMember(teamId, auth.userId)
  } catch {
    throw new AppError('FORBIDDEN', '팀 멤버만 이 작업을 수행할 수 있습니다.')
  }
}

function mapMessage(doc: ChatMessage): ChatMessageView {
  const rawReactions = Array.isArray(doc.reactions) ? doc.reactions : []
  const reactions = rawReactions.map((r) => ({
    emoji: r.emoji ?? '',
    userIds: Array.isArray(r.users)
      ? r.users.map((user) => user.userId ?? '').filter(Boolean)
      : [],
  }))

  return {
    id: String(doc.id),
    teamId: resolveRelationshipId(doc.team) ?? '',
    content: doc.content ?? '',
    authorId: resolveRelationshipId(doc.author) ?? '',
    authorEmail: resolveField(doc.author, 'email'),
    authorName: resolveField(doc.author, 'displayName') || resolveField(doc.author, 'email'),
    parentMessageId: doc.parentMessage ? resolveId(doc.parentMessage) : null,
    reactions,
    createdAt: typeof doc.createdAt === 'string' ? doc.createdAt : '',
    updatedAt: typeof doc.updatedAt === 'string' ? doc.updatedAt : '',
  }
}

export async function listMessages(
  teamId: string,
  options: { limit?: number; before?: string; after?: string } = {},
): Promise<ChatMessageView[]> {
  await assertTeamMember(teamId)
  const payload = await getPayloadClient()

  const where: Where[] = [{ team: { equals: teamId } }]
  if (options.before) {
    const ref = await payload.findByID({ collection: 'chat-messages', id: options.before })
    where.push({ createdAt: { less_than: ref.createdAt } })
  }
  if (options.after) {
    const ref = await payload.findByID({ collection: 'chat-messages', id: options.after })
    if (resolveRelationshipId(ref.team) !== teamId) {
      throw new AppError('FORBIDDEN', '다른 팀 메시지를 기준으로 조회할 수 없습니다.')
    }
    where.push({ createdAt: { greater_than: ref.createdAt } })
  }

  const result = await payload.find({
    collection: 'chat-messages',
    where: { and: where },
    sort: options.after ? 'createdAt' : '-createdAt',
    limit: options.limit ?? 50,
    depth: 1,
  })

  return result.docs.map(mapMessage)
}

export async function createMessage(data: CreateMessageData): Promise<ChatMessageView> {
  const auth = await requireAuthContext()
  const input = createMessageSchema.parse(data)
  await assertTeamMember(input.teamId)
  const payload = await getPayloadClient()

  const doc = await payload.create({
    collection: 'chat-messages',
    data: {
      team: input.teamId,
      content: input.content,
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
  const input = updateMessageSchema.parse({ content })
  const payload = await getPayloadClient()

  const existing = await payload.findByID({ collection: 'chat-messages', id: messageId, depth: 0 })
  await assertTeamMember(resolveRelationshipId(existing.team) ?? '')
  if (resolveRelationshipId(existing.author) !== auth.userId) {
    throw new AppError('FORBIDDEN', '자신이 작성한 메시지만 수정할 수 있습니다.')
  }

  const doc = await payload.update({
    collection: 'chat-messages',
    id: messageId,
    data: { content: input.content, editedAt: new Date().toISOString() },
    depth: 1,
  })

  return mapMessage(doc)
}

export async function deleteMessage(messageId: string): Promise<void> {
  const auth = await requireAuthContext()
  const payload = await getPayloadClient()

  const existing = await payload.findByID({ collection: 'chat-messages', id: messageId, depth: 0 })
  await assertTeamMember(resolveRelationshipId(existing.team) ?? '')
  if (resolveRelationshipId(existing.author) !== auth.userId) {
    throw new AppError('FORBIDDEN', '자신이 작성한 메시지만 삭제할 수 있습니다.')
  }

  await payload.delete({ collection: 'chat-messages', id: messageId })
}

export async function addReaction(messageId: string, emoji: string): Promise<ChatMessageView> {
  const auth = await requireAuthContext()
  const input = reactionSchema.parse({ emoji })
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

  const idx = rawReactions.findIndex((r) => r.emoji === input.emoji)
  if (idx >= 0) {
    const users: string[] = Array.isArray(rawReactions[idx].users)
      ? rawReactions[idx].users.map((u) => u.userId ?? '').filter(Boolean)
      : []
    if (users.includes(auth.userId)) {
      const nextUsers = users.filter((uid) => uid !== auth.userId)
      if (nextUsers.length === 0) {
        rawReactions.splice(idx, 1)
      } else {
        rawReactions[idx] = { ...rawReactions[idx], users: nextUsers.map((userId) => ({ userId })) }
      }
    } else {
      rawReactions[idx] = { ...rawReactions[idx], users: [...users, auth.userId].map((userId) => ({ userId })) }
    }
  } else {
    rawReactions.push({ emoji: input.emoji, users: [{ userId: auth.userId }] })
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
