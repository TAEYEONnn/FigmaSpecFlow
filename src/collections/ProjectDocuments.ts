import type { CollectionConfig } from 'payload'

export const ProjectDocuments: CollectionConfig = {
  slug: 'project-documents',
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
      name: 'revision',
      type: 'number',
      required: true,
    },
    {
      name: 'document',
      type: 'json',
      required: true,
    },
    {
      name: 'sourceRun',
      type: 'relationship',
      relationTo: 'compilation-runs',
      hasMany: false,
    },
  ],
}
