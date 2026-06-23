import type { CollectionConfig } from 'payload'

export const LoginAttempts: CollectionConfig = {
  slug: 'login-attempts',
  timestamps: true,
  admin: {
    hidden: true,
    useAsTitle: 'attemptKey',
  },
  access: {
    create: () => false,
    read: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'attemptKey',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'attemptCount',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'windowStartedAt',
      type: 'date',
      required: true,
    },
    {
      name: 'blockedUntil',
      type: 'date',
    },
  ],
}
