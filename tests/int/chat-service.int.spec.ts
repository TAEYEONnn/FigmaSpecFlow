import { describe, expect, it } from 'vitest'

import {
  createMessageSchema,
  reactionSchema,
  updateMessageSchema,
} from '@/lib/chat/schema'

describe('team chat domain', () => {
  it('validates a message with a team', () => {
    expect(createMessageSchema.parse({
      teamId: 'team-1',
      content: '안녕하세요',
    })).toEqual({
      teamId: 'team-1',
      content: '안녕하세요',
    })
  })

  it('rejects empty messages', () => {
    expect(() => createMessageSchema.parse({
      teamId: 'team-1',
      content: '   ',
    })).toThrow()
  })

  it('validates edits and reactions', () => {
    expect(updateMessageSchema.parse({ content: '수정한 메시지' })).toEqual({
      content: '수정한 메시지',
    })
    expect(reactionSchema.parse({ emoji: '👍' })).toEqual({ emoji: '👍' })
  })
})
