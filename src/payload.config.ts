import path from 'path'
import { buildFigmaConfig } from '@payloadcms/figma'
import { fileURLToPath } from 'url'
import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Projects } from './collections/Projects'
import { Sources } from './collections/Sources'
import { CompilationRuns } from './collections/CompilationRuns'
import { ProjectDocuments } from './collections/ProjectDocuments'
import { Profiles } from './collections/Profiles'
import { LoginAttempts } from './collections/LoginAttempts'
import { Teams } from './collections/Teams'
import { TeamMembers } from './collections/TeamMembers'
import { TeamInvitations } from './collections/TeamInvitations'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildFigmaConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    Users,
    Profiles,
    Media,
    Projects,
    Sources,
    CompilationRuns,
    ProjectDocuments,
    LoginAttempts,
    Teams,
    TeamMembers,
    TeamInvitations,
  ],
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  plugins: [],
  figma: {},
})
