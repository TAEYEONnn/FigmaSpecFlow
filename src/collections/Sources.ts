import type { CollectionConfig } from 'payload'

export const Sources: CollectionConfig = {
  slug: 'sources',
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
      relationTo: 'users',
      index: true,
      admin: {
        hidden: true,
      },
    },
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'sourceType',
      type: 'select',
      options: [
        { label: 'Paste', value: 'paste' },
        { label: 'TXT', value: 'txt' },
        { label: 'MD', value: 'md' },
        { label: 'PDF', value: 'pdf' },
      ],
    },
    {
      name: 'content',
      type: 'textarea',
    },
    {
      name: 'sizeBytes',
      type: 'number',
    },
  ],
}
