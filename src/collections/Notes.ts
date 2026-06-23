import type { CollectionConfig } from 'payload'

const Notes: CollectionConfig = {
  slug: 'notes',
  access: {
    read: ({ req }) => !!req.user,
    create: ({ req }) => !!req.user,
    update: ({ req }) => !!req.user,
    delete: ({ req }) => !!req.user,
  },
  fields: [
    { name: 'title', type: 'text' },
    { name: 'content', type: 'textarea' },
    { name: 'kind', type: 'select', required: true, defaultValue: 'note',
      options: [
        { label: 'Note', value: 'note' },
        { label: 'Scratch', value: 'scratch' },
      ],
    },
    { name: 'visibility', type: 'select', required: true, defaultValue: 'personal',
      options: [
        { label: 'Personal', value: 'personal' },
        { label: 'Team', value: 'team' },
      ],
    },
    { name: 'team', type: 'relationship', relationTo: 'teams' },
    { name: 'project', type: 'relationship', relationTo: 'projects' },
    { name: 'createdBy', type: 'relationship', relationTo: 'accounts', required: true },
    { name: 'pinned', type: 'checkbox', defaultValue: false },
    { name: 'tags', type: 'array', fields: [{ name: 'tag', type: 'text' }] },
  ],
  timestamps: true,
}

export default Notes
