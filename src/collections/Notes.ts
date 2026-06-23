import type { CollectionConfig } from 'payload'
import { noteAccess } from '@/lib/access/workspace-collections'

const Notes: CollectionConfig = {
  slug: 'notes',
  access: noteAccess,
  hooks: {
    beforeChange: [
      ({ data, operation, req }) => {
        if (!req.user || req.user.collection !== 'accounts') return data
        if (operation === 'create') data.createdBy = req.user.id
        data.updatedBy = req.user.id
        if (data.visibility === 'personal') data.team = null
        return data
      },
    ],
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
    { name: 'createdBy', type: 'relationship', relationTo: 'accounts', required: true, admin: { readOnly: true } },
    { name: 'updatedBy', type: 'relationship', relationTo: 'accounts', required: true, admin: { readOnly: true } },
    { name: 'pinned', type: 'checkbox', defaultValue: false },
    { name: 'tags', type: 'array', fields: [{ name: 'tag', type: 'text' }] },
  ],
  timestamps: true,
}

export default Notes
