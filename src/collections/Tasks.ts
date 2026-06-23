import type { CollectionConfig } from 'payload'
import { taskAccess } from '@/lib/access/workspace-collections'

const Tasks: CollectionConfig = {
  slug: 'tasks',
  access: taskAccess,
  hooks: {
    beforeChange: [
      ({ data, operation, req }) => {
        if (!req.user || req.user.collection !== 'accounts') return data
        if (operation === 'create') data.createdBy = req.user.id
        if (data.isPersonal) {
          data.team = null
          data.assignee = req.user.id
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'status', type: 'select', required: true, defaultValue: 'todo',
      options: [
        { label: 'To Do', value: 'todo' },
        { label: 'In Progress', value: 'inProgress' },
        { label: 'Done', value: 'done' },
      ],
    },
    { name: 'priority', type: 'select', required: true, defaultValue: 'medium',
      options: [
        { label: 'Low', value: 'low' },
        { label: 'Medium', value: 'medium' },
        { label: 'High', value: 'high' },
      ],
    },
    { name: 'dueDate', type: 'date' },
    { name: 'isPersonal', type: 'checkbox', required: true, defaultValue: false },
    { name: 'team', type: 'relationship', relationTo: 'teams' },
    { name: 'project', type: 'relationship', relationTo: 'projects' },
    { name: 'assignee', type: 'relationship', relationTo: 'accounts' },
    { name: 'createdBy', type: 'relationship', relationTo: 'accounts', required: true, admin: { readOnly: true } },
  ],
  timestamps: true,
}

export default Tasks
