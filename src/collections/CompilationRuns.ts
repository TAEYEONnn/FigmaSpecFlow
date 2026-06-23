import type { CollectionConfig } from 'payload'

export const CompilationRuns: CollectionConfig = {
  slug: 'compilation-runs',
  timestamps: true,
  access: {
    create: ({ req }) => Boolean(req.user),
    read: ({ req }) => {
      if (!req.user) return false
      return { 'project.owner': { equals: req.user.id } }
    },
    update: ({ req }) => {
      if (!req.user) return false
      return { 'project.owner': { equals: req.user.id } }
    },
    delete: ({ req }) => {
      if (!req.user) return false
      return { 'project.owner': { equals: req.user.id } }
    },
  },
  fields: [
    {
      name: 'project',
      type: 'relationship',
      relationTo: 'projects',
      required: true,
      index: true,
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'accounts',
      index: true,
      admin: {
        hidden: true,
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        { label: 'Queued', value: 'queued' },
        { label: 'Running', value: 'running' },
        { label: 'Completed', value: 'completed' },
        { label: 'Failed', value: 'failed' },
      ],
    },
    {
      name: 'model',
      type: 'text',
    },
    {
      name: 'promptVersion',
      type: 'text',
    },
    {
      name: 'durationMs',
      type: 'number',
    },
    {
      name: 'errorCode',
      type: 'text',
    },
    {
      name: 'errorMessage',
      type: 'text',
    },
    {
      name: 'output',
      type: 'json',
    },
    {
      name: 'finishedAt',
      type: 'date',
    },
  ],
}
