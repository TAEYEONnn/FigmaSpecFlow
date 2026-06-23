import type { CollectionConfig } from 'payload'

export const Accounts: CollectionConfig = {
  slug: 'accounts',
  admin: {
    useAsTitle: 'email',
  },
  auth: {
    cookies: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
    },
  },
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
  fields: [
    {
      name: 'displayName',
      type: 'text',
      label: '표시 이름',
    },
  ],
}
