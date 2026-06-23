import type { CollectionConfig } from 'payload'

export const TeamMembers: CollectionConfig = {
  slug: 'team-members',
  timestamps: true,
  access: {
    create: ({ req }) => Boolean(req.user),
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'team', type: 'relationship', relationTo: 'teams', required: true },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'member',
      options: [
        { label: 'Owner', value: 'owner' },
        { label: 'Member', value: 'member' },
      ],
    },
  ],
}
