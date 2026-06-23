import { describe, expect, it } from 'vitest'

import {
  createNoteSchema,
  updateNoteSchema,
} from '@/lib/notes/schema'
import { noteRecordWhere } from '@/lib/notes/service'

describe('workspace note domain', () => {
  it('allows a titleless scratch', () => {
    expect(createNoteSchema.parse({
      content: '생각난 내용',
      kind: 'scratch',
      visibility: 'personal',
    })).toMatchObject({
      content: '생각난 내용',
      kind: 'scratch',
      visibility: 'personal',
      pinned: false,
    })
  })

  it('requires a team for shared notes', () => {
    expect(() => createNoteSchema.parse({
      title: '공유 메모',
      content: '',
      kind: 'note',
      visibility: 'team',
    })).toThrow()
  })

  it('accepts autosave content patches', () => {
    expect(updateNoteSchema.parse({ content: '자동 저장' })).toEqual({
      content: '자동 저장',
    })
  })

  it('builds personal and team note scopes', () => {
    expect(noteRecordWhere('account-1', ['team-1'])).toEqual({
      or: [
        {
          and: [
            { visibility: { equals: 'personal' } },
            { createdBy: { equals: 'account-1' } },
          ],
        },
        {
          and: [
            { visibility: { equals: 'team' } },
            { team: { in: ['team-1'] } },
          ],
        },
      ],
    })
  })
})
