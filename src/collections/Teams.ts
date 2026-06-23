import type { CollectionConfig } from 'payload'

export const Teams: CollectionConfig = {
  slug: 'teams',
  timestamps: true,
  admin: { useAsTitle: 'name' },
  access: {
    create: ({ req }) => Boolean(req.user),
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'owner', type: 'relationship', relationTo: 'users', required: true },
  ],
}
