import { describe, expect, it } from 'vitest'

import { resolveRelationshipId } from '@/lib/access/relationships'
import {
  buildTeamMemberReadWhere,
  buildWorkspaceReadWhere,
} from '@/lib/access/team-scope'

describe('workspace access scope', () => {
  it('resolves relationship IDs without stringifying missing values', () => {
    expect(resolveRelationshipId('account-1')).toBe('account-1')
    expect(resolveRelationshipId(42)).toBe('42')
    expect(resolveRelationshipId({ id: 'account-2' })).toBe('account-2')
    expect(resolveRelationshipId(null)).toBeNull()
    expect(resolveRelationshipId(undefined)).toBeNull()
  })

  it('limits membership rows to the current account', () => {
    expect(buildTeamMemberReadWhere('account-1')).toEqual({
      user: { equals: 'account-1' },
    })
  })

  it('combines personal ownership and accessible team rows', () => {
    expect(buildWorkspaceReadWhere('account-1', ['team-1', 'team-2'])).toEqual({
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
            { team: { in: ['team-1', 'team-2'] } },
          ],
        },
      ],
    })
  })

  it('returns only personal records when the user has no teams', () => {
    expect(buildWorkspaceReadWhere('account-1', [])).toEqual({
      and: [
        { isPersonal: { equals: true } },
        { createdBy: { equals: 'account-1' } },
      ],
    })
  })
})
