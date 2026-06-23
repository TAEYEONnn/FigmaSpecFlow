import type { CollectionConfig } from 'payload'

export const Projects: CollectionConfig = {
  slug: 'projects',
  timestamps: true,
  access: {
    create: ({ req }) => Boolean(req.user),
    read: ({ req }) => {
      if (!req.user) return false
      return { owner: { equals: req.user.id } }
    },
    update: ({ req }) => {
      if (!req.user) return false
      return { owner: { equals: req.user.id } }
    },
    delete: ({ req }) => {
      if (!req.user) return false
      return { owner: { equals: req.user.id } }
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'revision',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'needsRecompile',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'currentDocument',
      type: 'relationship',
      relationTo: 'project-documents',
      hasMany: false,
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        hidden: true,
      },
    },
  ],
}
