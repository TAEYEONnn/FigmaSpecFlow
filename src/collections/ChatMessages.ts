import type { CollectionConfig } from 'payload'

const ChatMessages: CollectionConfig = {
  slug: 'chat-messages',
  access: {
    read: ({ req }) => !!req.user,
    create: ({ req }) => !!req.user,
    update: ({ req }) => !!req.user,
    delete: ({ req }) => !!req.user,
  },
  fields: [
    { name: 'content', type: 'textarea', required: true },
    { name: 'team', type: 'relationship', relationTo: 'teams', required: true },
    { name: 'author', type: 'relationship', relationTo: 'accounts', required: true },
    { name: 'parentMessage', type: 'relationship', relationTo: 'chat-messages' },
    { name: 'reactions', type: 'array', fields: [
      { name: 'emoji', type: 'text' },
      { name: 'count', type: 'number', defaultValue: 0 },
      { name: 'users', type: 'array', fields: [{ name: 'userId', type: 'text' }] },
    ]},
    { name: 'editedAt', type: 'date' },
  ],
  timestamps: true,
}

export default ChatMessages
