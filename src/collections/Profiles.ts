import type { CollectionConfig } from 'payload'

export const Profiles: CollectionConfig = {
  slug: 'profiles',
  timestamps: true,
  admin: {
    useAsTitle: 'username',
  },
  access: {
    create: ({ req }) => Boolean(req.user),
    read: ({ req }) => {
      if (!req.user) return false
      return { user: { equals: req.user.id } }
    },
    update: ({ req }) => {
      if (!req.user) return false
      return { user: { equals: req.user.id } }
    },
    delete: ({ req }) => {
      if (!req.user) return false
      return { user: { equals: req.user.id } }
    },
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'accounts',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'username',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'internalEmail',
      type: 'email',
      required: true,
      unique: true,
      index: true,
    },
  ],
}
