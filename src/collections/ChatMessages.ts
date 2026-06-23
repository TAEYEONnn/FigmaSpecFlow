import type { CollectionConfig } from 'payload'
import { chatMessageAccess } from '@/lib/access/workspace-collections'

const ChatMessages: CollectionConfig = {
  slug: 'chat-messages',
  access: chatMessageAccess,
  hooks: {
    beforeChange: [
      ({ data, operation, req }) => {
        if (operation === 'create' && req.user?.collection === 'accounts') {
          data.author = req.user.id
        }
        return data
      },
    ],
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
