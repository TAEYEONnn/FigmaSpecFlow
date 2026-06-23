import type { CollectionConfig } from 'payload'

export const Projects: CollectionConfig = {
  slug: 'projects',
  timestamps: true,
  access: {
    create: ({ req }) => Boolean(req.user),
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
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
      name: 'archived',
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
      relationTo: 'accounts',
      required: true,
      admin: {
        hidden: true,
      },
    },
    {
      name: 'team',
      type: 'relationship',
      relationTo: 'teams',
      hasMany: false,
      admin: {
        hidden: true,
      },
    },
  ],
}
