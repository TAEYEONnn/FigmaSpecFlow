import { describe, expect, it, vi } from 'vitest'

import {
  chatMessageAccess,
  noteAccess,
  taskAccess,
} from '@/lib/access/workspace-collections'

function requestFor(userId?: string, teamIds: string[] = ['team-1']) {
  return {
    user: userId ? { id: userId, collection: 'accounts' } : null,
    payload: {
      find: vi.fn().mockResolvedValue({
        docs: teamIds.map((team) => ({ team })),
      }),
    },
  }
}

describe('workspace collection access', () => {
  it('rejects anonymous users', async () => {
    expect(await taskAccess.read({ req: requestFor() as never })).toBe(false)
    expect(await noteAccess.read({ req: requestFor() as never })).toBe(false)
    expect(await chatMessageAccess.read({ req: requestFor() as never })).toBe(false)
  })

  it('limits tasks to personal ownership or accessible teams', async () => {
    expect(await taskAccess.read({ req: requestFor('account-1') as never })).toEqual({
      or: [
        {
          and: [
            { isPersonal: { equals: true } },
            { createdBy: { equals: 'account-1' } },
          ],
        },
        {
          and: [
            { isPersonal: { equals: false } },
            { team: { in: ['team-1'] } },
          ],
        },
      ],
    })
  })

  it('limits notes to personal ownership or accessible team visibility', async () => {
    expect(await noteAccess.read({ req: requestFor('account-1') as never })).toEqual({
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

  it('limits chat to accessible teams and author-only mutations', async () => {
    expect(await chatMessageAccess.read({ req: requestFor('account-1') as never })).toEqual({
      team: { in: ['team-1'] },
    })
    expect(await chatMessageAccess.update({ req: requestFor('account-1') as never })).toEqual({
      author: { equals: 'account-1' },
    })
    expect(await chatMessageAccess.delete({ req: requestFor('account-1') as never })).toEqual({
      author: { equals: 'account-1' },
    })
  })
})
