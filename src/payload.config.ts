import path from 'path'
import { buildFigmaConfig } from '@payloadcms/figma'
import { fileURLToPath } from 'url'
import { Users } from './collections/Users'
import { Accounts } from './collections/Accounts'
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
import Tasks from './collections/Tasks'
import Notes from './collections/Notes'
import ChatMessages from './collections/ChatMessages'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// buildFigmaConfig injects oAuth2Plugin which sets disableLocalStrategy=true by
// default on the users collection. When FIGMA_OAUTH_CLIENT_ID is absent (bootstrap
// not yet completed), this leaves no working auth path for Payload Admin.
// Patching after buildFigmaConfig restores local email+password as a fallback.
function withLocalStrategyFallback(configPromise: ReturnType<typeof buildFigmaConfig>) {
  return configPromise.then((config) => {
    if (!process.env.FIGMA_OAUTH_CLIENT_ID) {
      const users = config.collections?.find((c) => c.slug === 'users') as
        | (typeof config.collections[number] & { auth?: Record<string, unknown> })
        | undefined
      if (users && users.auth && typeof users.auth === 'object') {
        // SanitizedCollectionConfig types disableLocalStrategy as true|{...}.
        // Deleting the key is the correct way to re-enable local strategy.
        delete (users.auth as Record<string, unknown>)['disableLocalStrategy']
      }
    }
    return config
  })
}

export default withLocalStrategyFallback(buildFigmaConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      afterNavLinks: ['@/components/admin/back-to-app-link#BackToAppLink'],
    },
  },
  collections: [
    Users,
    Accounts,
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
    Tasks,
    Notes,
    ChatMessages,
  ],
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  plugins: [],
  figma: {},
}))
