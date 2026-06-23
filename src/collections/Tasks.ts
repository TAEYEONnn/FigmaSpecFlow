import type { CollectionConfig } from 'payload'

const Tasks: CollectionConfig = {
  slug: 'tasks',
  access: {
    read: ({ req }) => {
      if (!req.user) return false
      // Will be filtered by service layer based on teamId/authorId
      return true
    },
    create: ({ req }) => !!req.user,
    update: ({ req }) => !!req.user,
    delete: ({ req }) => !!req.user,
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
    { name: 'createdBy', type: 'relationship', relationTo: 'accounts', required: true },
  ],
  timestamps: true,
}

export default Tasks
