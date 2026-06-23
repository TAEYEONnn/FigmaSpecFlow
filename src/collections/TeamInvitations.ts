import type { CollectionConfig } from 'payload'

export const TeamInvitations: CollectionConfig = {
  slug: 'team-invitations',
  timestamps: true,
  access: {
    create: ({ req }) => Boolean(req.user),
    read: () => true,
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'team', type: 'relationship', relationTo: 'teams', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'invitedBy', type: 'relationship', relationTo: 'users', required: true },
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
    { name: 'token', type: 'text', required: true, unique: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Accepted', value: 'accepted' },
        { label: 'Rejected', value: 'rejected' },
      ],
    },
    { name: 'expiresAt', type: 'date', required: true },
  ],
}
