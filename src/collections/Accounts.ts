import type { CollectionConfig } from 'payload'

export const Accounts: CollectionConfig = {
  slug: 'accounts',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  access: {
    create: () => true,
    read: ({ req }) => {
      if (!req.user || req.user.collection !== 'accounts') return false
      return { id: { equals: req.user.id } }
    },
    update: ({ req }) => {
      if (!req.user || req.user.collection !== 'accounts') return false
      return { id: { equals: req.user.id } }
    },
    delete: ({ req }) => {
      if (!req.user || req.user.collection !== 'accounts') return false
      return { id: { equals: req.user.id } }
    },
  },
  fields: [],
}
