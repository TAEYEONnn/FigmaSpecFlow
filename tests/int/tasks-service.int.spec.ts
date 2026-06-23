import { describe, expect, it } from 'vitest'

import { createTaskSchema, updateTaskSchema } from '@/lib/tasks/schema'
import { taskRecordWhere } from '@/lib/tasks/service'

describe('workspace task domain', () => {
  it('validates personal task input', () => {
    expect(createTaskSchema.parse({
      title: '오늘 할 일',
      isPersonal: true,
    })).toMatchObject({
      title: '오늘 할 일',
      isPersonal: true,
      status: 'todo',
      priority: 'medium',
    })
  })

  it('rejects an empty title', () => {
    expect(() => createTaskSchema.parse({
      title: '   ',
      isPersonal: true,
    })).toThrow()
  })

  it('allows partial task updates', () => {
    expect(updateTaskSchema.parse({ status: 'done' })).toEqual({ status: 'done' })
  })

  it('builds personal and team record scopes', () => {
    expect(taskRecordWhere('account-1', [])).toEqual({
      and: [
        { isPersonal: { equals: true } },
        { createdBy: { equals: 'account-1' } },
      ],
    })
    expect(taskRecordWhere('account-1', ['team-1'])).toEqual({
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
})
