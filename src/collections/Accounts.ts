import type { CollectionConfig } from 'payload'

export const Accounts: CollectionConfig = {
  slug: 'accounts',
  admin: {
    useAsTitle: 'email',
  },
  auth: {
    cookies: {
      secure: true,
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
    {
      name: 'role',
      type: 'select',
      label: '서비스 권한',
      defaultValue: 'user',
      options: [
        { label: '일반 사용자', value: 'user' },
        { label: '관리자', value: 'admin' },
      ],
      // Service users cannot escalate their own role — only Payload Admin can.
      access: {
        update: ({ req }) => req.user?.collection !== 'accounts',
      },
    },
  ],
}
