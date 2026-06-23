import { describe, expect, it } from 'vitest'

import { CompilationRuns } from '@/collections/CompilationRuns'
import { LoginAttempts } from '@/collections/LoginAttempts'
import { Profiles } from '@/collections/Profiles'
import { ProjectDocuments } from '@/collections/ProjectDocuments'
import { Projects } from '@/collections/Projects'
import { Sources } from '@/collections/Sources'

function fieldNames(collection: typeof Projects) {
  return collection.fields.map((field) => ('name' in field ? field.name : null))
}

describe('application collections', () => {
  it('registers the supplied application tables', () => {
    expect([
      Profiles.slug,
      Projects.slug,
      Sources.slug,
      CompilationRuns.slug,
      ProjectDocuments.slug,
      LoginAttempts.slug,
    ]).toEqual([
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
