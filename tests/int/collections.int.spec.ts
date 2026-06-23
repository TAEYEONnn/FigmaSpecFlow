import { describe, expect, it } from 'vitest'

import { CompilationRuns } from '@/collections/CompilationRuns'
import { Accounts } from '@/collections/Accounts'
import { LoginAttempts } from '@/collections/LoginAttempts'
import { Profiles } from '@/collections/Profiles'
import { ProjectDocuments } from '@/collections/ProjectDocuments'
import { Projects } from '@/collections/Projects'
import { Sources } from '@/collections/Sources'

function fieldNames(collection: typeof Projects) {
  return collection.fields.map((field) => ('name' in field ? field.name : null))
}

function relationshipTarget(collection: typeof Projects, fieldName: string) {
  const field = collection.fields.find(
    (candidate) => 'name' in candidate && candidate.name === fieldName,
  )
  return field && 'relationTo' in field ? field.relationTo : null
}

describe('application collections', () => {
  it('registers the supplied application tables', () => {
    expect([
      Accounts.slug,
      Profiles.slug,
      Projects.slug,
      Sources.slug,
      CompilationRuns.slug,
      ProjectDocuments.slug,
      LoginAttempts.slug,
    ]).toEqual([
      'accounts',
      'profiles',
      'projects',
      'sources',
      'compilation-runs',
      'project-documents',
      'login-attempts',
    ])
  })

  it('stores the owning user on project child records', () => {
    expect(fieldNames(Sources)).toContain('user')
    expect(fieldNames(CompilationRuns)).toContain('user')
    expect(fieldNames(ProjectDocuments)).toContain('user')
  })

  it('uses the app account collection for application ownership', () => {
    expect(relationshipTarget(Profiles, 'user')).toBe('accounts')
    expect(relationshipTarget(Projects, 'owner')).toBe('accounts')
    expect(relationshipTarget(Sources, 'user')).toBe('accounts')
    expect(relationshipTarget(CompilationRuns, 'user')).toBe('accounts')
    expect(relationshipTarget(ProjectDocuments, 'user')).toBe('accounts')
  })

  it('stores profile and login-attempt fields', () => {
    expect(fieldNames(Profiles)).toEqual(
      expect.arrayContaining(['user', 'username', 'internalEmail']),
    )
    expect(fieldNames(LoginAttempts)).toEqual(
      expect.arrayContaining([
        'attemptKey',
        'attemptCount',
        'windowStartedAt',
        'blockedUntil',
      ]),
    )
  })
})
