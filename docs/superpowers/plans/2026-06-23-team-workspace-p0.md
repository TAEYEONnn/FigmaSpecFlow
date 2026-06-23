# Team Workspace P0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the existing SpecFlow project editor while adding a secure, lightweight team workspace with a global home, tasks, notes/scratchpad, public team chat, and working quick-create actions.

**Architecture:** Add an authenticated workspace route group and shared shell around new global pages while leaving the existing project editor as a project-local application. Centralize team membership and record-scope authorization in reusable server helpers, enforce the same rules in Payload collection access and service functions, and expose typed route handlers consumed by focused client components. Keep `SpecDocument.tasks` separate from the new workspace `tasks` collection.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Payload CMS 3.85, Zod 4, Phosphor Icons, Vitest, Testing Library, Playwright, existing CSS tokens.

---

## Scope and delivery boundaries

This plan implements P0 only:

1. Global workspace information architecture and home
2. Team and personal tasks
3. Team and personal notes plus autosaving scratchpad
4. One public chat room per team
5. Quick creation for task, note, scratch, and project

P1 remains a separate plan:

- resources and saved links
- global search
- activity feed
- chat threads
- message-to-task conversion
- link preview
- note tags and favorites
- project linking UX beyond the fields already supported
- notifications and image attachments

The global quick-create menu may show “링크” as disabled with an explicit P1 label. It must not pretend to save resources before a `resources` collection exists.

## Current-state constraints

- Preserve uncommitted user work in:
  - `src/payload.config.ts`
  - `src/collections/Tasks.ts`
  - `src/collections/Notes.ts`
  - `src/collections/ChatMessages.ts`
  - `src/lib/chat/service.ts`
- `/projects/[projectId]` and `src/components/workspace/workspace-shell.tsx` remain the project-local SpecFlow editor.
- `SpecDocument.tasks` remains the generated project implementation checklist. Workspace tasks use Payload collection `tasks`.
- App users authenticate through `accounts`; Payload admin users authenticate through `users`.
- Payload Local API normally bypasses collection access. Every user-scoped operation must either:
  - explicitly validate membership/ownership in its service, or
  - pass an authenticated Payload user with `overrideAccess: false`.
- Do not rely on browser-only filtering for private data.
- Do not split or broadly refactor the existing 3,413-line stylesheet during P0. Add focused workspace sections and remove only directly conflicting template rules.

## Target information architecture

```text
SpecFlow OS
├── 워크스페이스
│   ├── 홈                    /
│   ├── 대화                  /chat
│   ├── 할 일                 /tasks
│   ├── 메모                  /notes
│   └── 자료함                /resources        [P1]
├── 프로젝트
│   ├── 전체 프로젝트         /projects
│   ├── 최근 프로젝트         /projects/recent
│   └── 프로젝트 만들기       /projects/new
├── 팀
│   ├── 멤버                  /teams/:teamId
│   └── 팀 설정               /teams/:teamId
└── 내 공간
    ├── 내 할 일              /my/tasks
    └── 내 메모               /my/notes

/projects/:projectId
└── existing project-local navigation
    ├── 개요
    ├── 요구사항
    ├── 확인 질문
    ├── 결정 기록
    ├── 화면 흐름
    ├── 상태·예외
    ├── 역할·권한
    ├── 작업 목록
    ├── 원문
    ├── 변경 영향
    └── 활동 기록
```

## Core user flows

1. **Personal task from home:** open quick create → choose task → personal visibility → enter title/due date → save → remain on home → task appears in “내 할 일”.
2. **Team task assignment:** active team selected → create task → team visibility → select member → save → team task list updates.
3. **Chat:** open `/chat` → type message → submit → optimistic pending state → server confirms → polling fetches newer team messages.
4. **Scratch to note:** open `/notes` → type in scratch input → debounce autosave → choose “메모로 전환” → record kind changes to `note` and opens detail editor.
5. **Shared note:** create note → select team visibility → save → team members can read/edit; non-members cannot query it.
6. **Existing SpecFlow:** open recent project → `/projects/:projectId` → existing `WorkspaceShell` and all project-local tools work unchanged.
7. **Optional project relation:** task or note form may set `project`; the server validates that the user can access both the project and record scope.

## Data model

### `tasks`

```ts
type WorkspaceTask = {
  id: string
  title: string
  description?: string | null
  status: 'todo' | 'inProgress' | 'done'
  priority: 'low' | 'medium' | 'high'
  dueDate?: string | null
  isPersonal: boolean
  team?: string | null
  project?: string | null
  assignee?: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}
```

Rules:

- personal: `isPersonal=true`, `createdBy=current user`, `team=null`; only creator can read/write
- team: `isPersonal=false`, `team` required; members can read; creator or assignee may update status; creator and team owner/admin may edit/delete
- assignee must be a member of the selected team
- related project must be personal to the creator or belong to the same selected team

### `notes`

```ts
type WorkspaceNote = {
  id: string
  title?: string | null
  content?: string | null
  kind: 'note' | 'scratch'
  visibility: 'personal' | 'team'
  team?: string | null
  project?: string | null
  createdBy: string
  updatedBy: string
  pinned: boolean
  createdAt: string
  updatedAt: string
}
```

Rules:

- personal records are visible and writable only by `createdBy`
- team records require `team`; members can read and edit
- scratch may have no title
- conversion to task creates a task first, then deletes the scratch only after task creation succeeds
- conversion to note updates `kind` to `note`

### `chat-messages`

```ts
type ChatMessage = {
  id: string
  team: string
  author: string
  content: string
  reactions: Array<{ emoji: string; users: string[] }>
  editedAt?: string | null
  createdAt: string
  updatedAt: string
}
```

P0 rules:

- one implicit public room per team
- only team members may read/create/react
- only author may edit/delete
- parent/thread field may remain in schema for P1 but P0 UI does not expose it
- content is plain text rendered with safe linkification; never use unsanitized HTML

## File map

### Shared authorization and validation

- Create `src/lib/access/relationships.ts`: resolve Payload relationship IDs safely.
- Create `src/lib/access/team-scope.ts`: reusable team membership/role lookups and Payload access query builders.
- Create `src/lib/access/project-scope.ts`: verify personal/team project access.
- Create `src/lib/tasks/schema.ts`: request schemas and public task types.
- Create `src/lib/tasks/service.ts`: task authorization and CRUD.
- Create `src/lib/notes/schema.ts`: request schemas and public note types.
- Create `src/lib/notes/service.ts`: note authorization, autosave, and conversion.
- Modify `src/lib/chat/service.ts`: remove `any`, validate content, verify author membership, and support polling cursor.

### Payload collections

- Modify `src/collections/Tasks.ts`
- Modify `src/collections/Notes.ts`
- Modify `src/collections/ChatMessages.ts`
- Modify `src/collections/Projects.ts`
- Modify `src/collections/Teams.ts`
- Modify `src/collections/TeamMembers.ts`
- Modify `src/collections/Sources.ts`
- Modify `src/collections/ProjectDocuments.ts`
- Modify `src/collections/CompilationRuns.ts`
- Modify `src/payload.config.ts`
- Regenerate `src/payload-types.ts`

### Workspace context and shell

- Create `src/lib/workspace/active-team.ts`
- Create `src/components/workspace-global/workspace-shell.tsx`
- Create `src/components/workspace-global/workspace-sidebar.tsx`
- Create `src/components/workspace-global/workspace-header.tsx`
- Create `src/components/workspace-global/active-team-provider.tsx`
- Create `src/components/workspace-global/quick-create.tsx`
- Create `src/components/ui/dialog.tsx`
- Create `src/components/ui/empty-state.tsx`
- Create `src/components/ui/status-message.tsx`
- Modify `src/app/(frontend)/layout.tsx`
- Modify `src/components/projects/team-switcher.tsx`

### Pages and API

- Modify `src/app/(frontend)/page.tsx`
- Create `src/app/(frontend)/chat/page.tsx`
- Create `src/app/(frontend)/tasks/page.tsx`
- Create `src/app/(frontend)/notes/page.tsx`
- Create `src/app/(frontend)/my/tasks/page.tsx`
- Create `src/app/(frontend)/my/notes/page.tsx`
- Create `src/app/(frontend)/projects/recent/page.tsx`
- Modify existing project/team/profile pages to use the global shell without changing project editor internals.
- Create task, note, chat route handlers under `src/app/(frontend)/api/`.

### Feature components

- Create focused components under:
  - `src/components/home/`
  - `src/components/tasks/`
  - `src/components/notes/`
  - `src/components/chat/`

### Tests

- Create authorization and service integration tests in `tests/int/`.
- Extend `tests/e2e/frontend.e2e.spec.ts`.
- Add focused React tests and update Vitest include patterns so existing `src/**/*.test.*` files actually run.

---

### Task 1: Establish authorization primitives

**Files:**
- Create: `src/lib/access/relationships.ts`
- Create: `src/lib/access/team-scope.ts`
- Create: `src/lib/access/project-scope.ts`
- Test: `tests/int/access-scope.int.spec.ts`

- [ ] **Step 1: Write failing tests for relationship resolution and team-scope queries**

Test:

```ts
import { describe, expect, it } from 'vitest'
import { resolveRelationshipId } from '@/lib/access/relationships'
import { buildTeamMemberReadWhere } from '@/lib/access/team-scope'

describe('workspace access scope', () => {
  it('resolves string and populated relationships', () => {
    expect(resolveRelationshipId('account-1')).toBe('account-1')
    expect(resolveRelationshipId({ id: 'account-2' })).toBe('account-2')
    expect(resolveRelationshipId(null)).toBeNull()
  })

  it('limits team member rows to the current user', () => {
    expect(buildTeamMemberReadWhere('account-1')).toEqual({
      user: { equals: 'account-1' },
    })
  })
})
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
npx vitest run tests/int/access-scope.int.spec.ts --config vitest.config.mts
```

Expected: FAIL because access helpers do not exist.

- [ ] **Step 3: Implement relationship and membership helpers**

Implement:

```ts
export function resolveRelationshipId(value: unknown): string | null {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (value && typeof value === 'object' && 'id' in value) {
    return String((value as { id: string | number }).id)
  }
  return null
}
```

`team-scope.ts` must export:

```ts
export type TeamRole = 'owner' | 'admin' | 'member'
export function buildTeamMemberReadWhere(userId: string): Where
export async function getTeamMembership(teamId: string, userId: string): Promise<TeamRole | null>
export async function requireTeamMember(teamId: string, userId: string): Promise<TeamRole>
export async function requireTeamManager(teamId: string, userId: string): Promise<TeamRole>
export async function getAccessibleTeamIds(userId: string): Promise<string[]>
```

`project-scope.ts` must export:

```ts
export async function requireProjectAccess(projectId: string, userId: string): Promise<Project>
export async function requireProjectTeamCompatibility(
  projectId: string,
  userId: string,
  teamId: string | null,
): Promise<Project>
```

- [ ] **Step 4: Run the focused test**

Expected: PASS.

- [ ] **Step 5: Commit only these files**

```bash
git add src/lib/access tests/int/access-scope.int.spec.ts
git commit -m "feat: add workspace authorization primitives"
```

### Task 2: Enforce Payload collection access

**Files:**
- Modify: `src/collections/Tasks.ts`
- Modify: `src/collections/Notes.ts`
- Modify: `src/collections/ChatMessages.ts`
- Modify: `src/collections/Projects.ts`
- Modify: `src/collections/Teams.ts`
- Modify: `src/collections/TeamMembers.ts`
- Modify: `src/collections/Sources.ts`
- Modify: `src/collections/ProjectDocuments.ts`
- Modify: `src/collections/CompilationRuns.ts`
- Test: `tests/int/workspace-collections.int.spec.ts`

- [ ] **Step 1: Write collection access tests**

Create fixtures for two users and two teams. Exercise collection access functions with request users and assert:

```ts
expect(await taskRead({ req: reqFor(userA) })).toEqual({
  or: [
    { and: [{ isPersonal: { equals: true } }, { createdBy: { equals: userA.id } }] },
    { and: [{ isPersonal: { equals: false } }, { team: { in: [teamA.id] } }] },
  ],
})
```

Also assert:

- anonymous access returns `false`
- personal notes are creator-only
- team notes/messages are limited to team IDs
- project children use project access scope rather than owner-only scope

- [ ] **Step 2: Run and verify failure**

```bash
npx vitest run tests/int/workspace-collections.int.spec.ts --config vitest.config.mts
```

- [ ] **Step 3: Replace broad boolean access with row-level queries**

Collection access must:

- reject non-`accounts` users for app data
- return creator/team queries for reads
- use field hooks to prevent changing `createdBy` and `author`
- use `beforeValidate` or `beforeChange` hooks to populate immutable ownership fields from `req.user`
- add `updatedBy` relationship to notes
- require `team` when note visibility is `team`
- require `team` when task is not personal
- reject personal task/note records with a team
- store reaction users as relationships to `accounts`, not arbitrary text IDs

- [ ] **Step 4: Add server-side relationship validation hooks**

Hooks must verify:

- team is accessible to current account
- assignee belongs to task team
- project relation is accessible and compatible with the record team
- chat author is always current account

- [ ] **Step 5: Run collection tests and type generation**

```bash
npx vitest run tests/int/workspace-collections.int.spec.ts --config vitest.config.mts
npm run generate:types
```

Expected: tests PASS and `src/payload-types.ts` regenerates without schema errors.

- [ ] **Step 6: Commit collection security**

```bash
git add src/collections src/payload.config.ts src/payload-types.ts tests/int/workspace-collections.int.spec.ts
git commit -m "fix: enforce workspace collection access"
```

### Task 3: Add task schemas and secure service

**Files:**
- Create: `src/lib/tasks/schema.ts`
- Create: `src/lib/tasks/service.ts`
- Test: `tests/int/tasks-service.int.spec.ts`

- [ ] **Step 1: Write failing task service tests**

Cover:

- create personal task
- create team task
- reject team task by non-member
- reject another user reading personal task
- change assignee only to team member
- update status to done
- delete creator-owned task
- prevent cross-team listing

Use service dependency injection:

```ts
const service = createTaskService({ payload, auth: { userId: userA.id } })
```

This avoids mocking global cookies and makes authorization tests deterministic.

- [ ] **Step 2: Run and verify failure**

```bash
npx vitest run tests/int/tasks-service.int.spec.ts --config vitest.config.mts
```

- [ ] **Step 3: Implement Zod request schemas**

Export:

```ts
export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).optional(),
  status: z.enum(['todo', 'inProgress', 'done']).default('todo'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.iso.datetime().nullable().optional(),
  isPersonal: z.boolean(),
  teamId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
})
```

Create a separate patch schema with all mutable fields optional.

- [ ] **Step 4: Implement secure task service**

Export:

```ts
export function createTaskService(deps: TaskServiceDependencies): TaskService
export async function listTasks(query: TaskListQuery): Promise<WorkspaceTaskView[]>
export async function getTask(id: string): Promise<WorkspaceTaskView>
export async function createTask(input: CreateTaskInput): Promise<WorkspaceTaskView>
export async function updateTask(id: string, input: UpdateTaskInput): Promise<WorkspaceTaskView>
export async function deleteTask(id: string): Promise<void>
```

List filters:

- active team
- personal only
- assigned to me
- project
- status
- due bucket: today, upcoming, done
- text search

- [ ] **Step 5: Run task tests**

Expected: PASS.

- [ ] **Step 6: Commit task domain**

```bash
git add src/lib/tasks tests/int/tasks-service.int.spec.ts
git commit -m "feat: add secure workspace task service"
```

### Task 4: Add task API routes

**Files:**
- Create: `src/app/(frontend)/api/tasks/route.ts`
- Create: `src/app/(frontend)/api/tasks/[taskId]/route.ts`
- Test: `tests/int/tasks-api.int.spec.ts`

- [ ] **Step 1: Write route tests**

Assert:

- unauthenticated requests return 401
- malformed input returns 400 with existing `apiError` format
- POST returns 201
- PATCH returns updated task
- DELETE returns 204
- forbidden scope returns 403, not an empty 200 response

- [ ] **Step 2: Run and verify failure**

```bash
npx vitest run tests/int/tasks-api.int.spec.ts --config vitest.config.mts
```

- [ ] **Step 3: Implement route handlers**

Use:

```ts
const auth = await getAuthContext()
if (!auth) return apiError('로그인이 필요합니다.', 401)
```

Parse search parameters and body through task schemas. Map known authorization errors to 403 and missing records to 404.

- [ ] **Step 4: Run task API tests**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add 'src/app/(frontend)/api/tasks' tests/int/tasks-api.int.spec.ts
git commit -m "feat: expose workspace task API"
```

### Task 5: Add note schemas, service, autosave, and conversion

**Files:**
- Create: `src/lib/notes/schema.ts`
- Create: `src/lib/notes/service.ts`
- Test: `tests/int/notes-service.int.spec.ts`

- [ ] **Step 1: Write failing note tests**

Cover:

- personal note create/read isolation
- team note member access
- team note non-member rejection
- scratch create without title
- patch content for autosave
- scratch-to-note conversion
- scratch-to-personal-task conversion
- scratch is retained if task creation fails

- [ ] **Step 2: Run and verify failure**

```bash
npx vitest run tests/int/notes-service.int.spec.ts --config vitest.config.mts
```

- [ ] **Step 3: Implement note schemas**

```ts
export const createNoteSchema = z.object({
  title: z.string().trim().max(200).nullable().optional(),
  content: z.string().max(100_000).default(''),
  kind: z.enum(['note', 'scratch']),
  visibility: z.enum(['personal', 'team']),
  teamId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  pinned: z.boolean().default(false),
})
```

Add `updateNoteSchema` and `convertScratchSchema`.

- [ ] **Step 4: Implement note service**

Export:

```ts
export async function listNotes(query: NoteListQuery): Promise<WorkspaceNoteView[]>
export async function getNote(id: string): Promise<WorkspaceNoteView>
export async function createNote(input: CreateNoteInput): Promise<WorkspaceNoteView>
export async function updateNote(id: string, input: UpdateNoteInput): Promise<WorkspaceNoteView>
export async function deleteNote(id: string): Promise<void>
export async function convertScratchToNote(id: string): Promise<WorkspaceNoteView>
export async function convertScratchToTask(id: string): Promise<WorkspaceTaskView>
```

Conversion must be transactional where the adapter supports `req`; otherwise create task first and only delete scratch after success.

- [ ] **Step 5: Run note tests**

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/notes tests/int/notes-service.int.spec.ts
git commit -m "feat: add secure notes and scratch service"
```

### Task 6: Add note API routes

**Files:**
- Create: `src/app/(frontend)/api/notes/route.ts`
- Create: `src/app/(frontend)/api/notes/[noteId]/route.ts`
- Create: `src/app/(frontend)/api/notes/[noteId]/convert/route.ts`
- Test: `tests/int/notes-api.int.spec.ts`

- [ ] **Step 1: Write failing route tests**

Cover GET, POST, PATCH, DELETE, and conversion actions with 401/400/403/404 behavior.

- [ ] **Step 2: Run and verify failure**

```bash
npx vitest run tests/int/notes-api.int.spec.ts --config vitest.config.mts
```

- [ ] **Step 3: Implement note routes**

Conversion request:

```ts
const body = z.object({ target: z.enum(['note', 'task']) }).parse(await request.json())
```

Return the created/updated target record and its type.

- [ ] **Step 4: Run note API tests**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add 'src/app/(frontend)/api/notes' tests/int/notes-api.int.spec.ts
git commit -m "feat: expose notes and scratch API"
```

### Task 7: Harden chat service and expose chat API

**Files:**
- Modify: `src/lib/chat/service.ts`
- Create: `src/lib/chat/schema.ts`
- Create: `src/app/(frontend)/api/chat/route.ts`
- Create: `src/app/(frontend)/api/chat/[messageId]/route.ts`
- Create: `src/app/(frontend)/api/chat/[messageId]/reactions/route.ts`
- Test: `tests/int/chat-service.int.spec.ts`
- Test: `tests/int/chat-api.int.spec.ts`

- [ ] **Step 1: Write chat authorization and CRUD tests**

Cover:

- member list/create
- non-member list/create rejection
- author edit/delete
- other member edit/delete rejection
- member reaction
- duplicate reaction is idempotent
- team separation
- polling with `after` cursor returns only newer messages

- [ ] **Step 2: Run and verify failure**

```bash
npx vitest run tests/int/chat-service.int.spec.ts tests/int/chat-api.int.spec.ts --config vitest.config.mts
```

- [ ] **Step 3: Add chat schemas**

```ts
export const createMessageSchema = z.object({
  teamId: z.string().min(1),
  content: z.string().trim().min(1).max(10_000),
})

export const reactionSchema = z.object({
  emoji: z.string().trim().min(1).max(16),
})
```

- [ ] **Step 4: Harden chat service**

Replace `any` mapping with generated Payload types. Validate the message’s team before edit/delete, set `editedAt`, and implement `after` polling ordered oldest-to-newest for incremental append.

- [ ] **Step 5: Implement chat routes**

Endpoints:

```text
GET    /api/chat?teamId=...&after=...
POST   /api/chat
PATCH  /api/chat/:messageId
DELETE /api/chat/:messageId
POST   /api/chat/:messageId/reactions
```

- [ ] **Step 6: Run chat tests**

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/chat 'src/app/(frontend)/api/chat' tests/int/chat-*.int.spec.ts
git commit -m "feat: add secure team chat API"
```

### Task 8: Introduce active-team state and global workspace shell

**Files:**
- Create: `src/lib/workspace/active-team.ts`
- Create: `src/components/workspace-global/active-team-provider.tsx`
- Create: `src/components/workspace-global/workspace-shell.tsx`
- Create: `src/components/workspace-global/workspace-sidebar.tsx`
- Create: `src/components/workspace-global/workspace-header.tsx`
- Modify: `src/components/projects/team-switcher.tsx`
- Modify: `src/app/(frontend)/layout.tsx`
- Test: `src/components/workspace-global/active-team-provider.test.tsx`
- Test: `src/components/workspace-global/workspace-sidebar.test.tsx`

- [ ] **Step 1: Expand Vitest include patterns**

Modify `vitest.config.mts`:

```ts
include: [
  'tests/int/**/*.int.spec.ts',
  'src/**/*.test.ts',
  'src/**/*.test.tsx',
]
```

Run existing tests and record any newly exposed failures before feature work.

- [ ] **Step 2: Write active-team tests**

Assert:

- saved valid team wins
- one team auto-selects
- invalid saved team falls back to first team
- no teams yields personal workspace
- selection persists to local storage

- [ ] **Step 3: Implement active team resolution**

Use one shared storage key:

```ts
export const ACTIVE_TEAM_STORAGE_KEY = 'specflow:lastTeamId'
```

Provider value:

```ts
type ActiveTeamContextValue = {
  teams: TeamSummary[]
  activeTeam: TeamSummary | null
  setActiveTeamId(id: string | null): void
  personalMode: boolean
}
```

- [ ] **Step 4: Write sidebar accessibility tests**

Assert semantic `<nav>`, active link `aria-current="page"`, team switch button labeling, keyboard-usable quick-create button, and hidden P1 resource link marked unavailable.

- [ ] **Step 5: Implement shared shell**

The shell must not render on `/login`, `/signup`, or invitation acceptance pages. It must render around home, global workspace, project list, team, and profile pages. For `/projects/[projectId]`, render a compact global “back to workspace” affordance without duplicating the full global sidebar over the existing project-local sidebar.

- [ ] **Step 6: Run component tests**

```bash
npx vitest run src/components/workspace-global --config vitest.config.mts
```

- [ ] **Step 7: Commit**

```bash
git add vitest.config.mts src/lib/workspace src/components/workspace-global src/components/projects/team-switcher.tsx 'src/app/(frontend)/layout.tsx'
git commit -m "feat: add global workspace shell"
```

### Task 9: Add shared dialogs and quick-create infrastructure

**Files:**
- Create: `src/components/ui/dialog.tsx`
- Create: `src/components/ui/empty-state.tsx`
- Create: `src/components/ui/status-message.tsx`
- Create: `src/components/workspace-global/quick-create.tsx`
- Test: `src/components/ui/dialog.test.tsx`
- Test: `src/components/workspace-global/quick-create.test.tsx`

- [ ] **Step 1: Write dialog behavior tests**

Assert:

- initial focus enters dialog
- Escape closes
- focus returns to trigger
- dialog has accessible name
- backdrop click closes only when allowed

- [ ] **Step 2: Implement reusable dialog**

Use native `<dialog>` where supported or a role-dialog implementation with focus management. Do not add a new dependency.

- [ ] **Step 3: Write quick-create tests**

Assert actions for task, note, scratch, project, and disabled P1 link. After successful creation, close the dialog and emit a refresh event without navigating away.

- [ ] **Step 4: Implement quick-create controller**

The controller selects focused feature forms supplied by Tasks 10 and 11. Project creation reuses the existing project endpoint and accepts the active team.

- [ ] **Step 5: Run tests and commit**

```bash
npx vitest run src/components/ui src/components/workspace-global/quick-create.test.tsx --config vitest.config.mts
git add src/components/ui src/components/workspace-global/quick-create*
git commit -m "feat: add accessible quick create"
```

### Task 10: Build task UI and routes

**Files:**
- Create: `src/components/tasks/task-form.tsx`
- Create: `src/components/tasks/task-list.tsx`
- Create: `src/components/tasks/task-item.tsx`
- Create: `src/components/tasks/task-detail-dialog.tsx`
- Create: `src/components/tasks/task-filters.tsx`
- Create: `src/app/(frontend)/tasks/page.tsx`
- Create: `src/app/(frontend)/my/tasks/page.tsx`
- Test: `src/components/tasks/task-list.test.tsx`
- Test: `src/components/tasks/task-form.test.tsx`

- [ ] **Step 1: Write task form tests**

Cover title validation, personal/team mode, member assignment, due date, priority, project selection, submission error, and duplicate-submit prevention.

- [ ] **Step 2: Implement task form**

Use native form controls with labels and inline errors. Keep creation in a dialog. Never send team or assignee values when personal mode is selected.

- [ ] **Step 3: Write task list interaction tests**

Cover:

- grouped Today/Upcoming/Done views
- complete checkbox
- status and assignee changes
- search and filters
- empty/loading/error states
- delete confirmation

- [ ] **Step 4: Implement team task page**

`/tasks` loads the active team and shows team records. If no team exists, explain that a team is required and link to `/teams/new`.

- [ ] **Step 5: Implement personal task page**

`/my/tasks` combines:

- personal tasks created by current user
- active team tasks assigned to current user

Clearly label each record’s scope.

- [ ] **Step 6: Run tests and commit**

```bash
npx vitest run src/components/tasks --config vitest.config.mts
git add src/components/tasks 'src/app/(frontend)/tasks' 'src/app/(frontend)/my/tasks'
git commit -m "feat: add team and personal task UI"
```

### Task 11: Build notes and scratch UI

**Files:**
- Create: `src/components/notes/note-form.tsx`
- Create: `src/components/notes/note-list.tsx`
- Create: `src/components/notes/note-editor.tsx`
- Create: `src/components/notes/scratch-composer.tsx`
- Create: `src/components/notes/use-autosave.ts`
- Create: `src/app/(frontend)/notes/page.tsx`
- Create: `src/app/(frontend)/my/notes/page.tsx`
- Test: `src/components/notes/scratch-composer.test.tsx`
- Test: `src/components/notes/note-editor.test.tsx`

- [ ] **Step 1: Write autosave tests with fake timers**

Assert:

- no request before 600 ms idle
- one PATCH after idle
- latest content wins
- saving/saved/error status is announced
- retry preserves typed text

- [ ] **Step 2: Implement `useAutosave`**

The hook must abort stale requests and expose:

```ts
type AutosaveState = 'idle' | 'saving' | 'saved' | 'error'
```

- [ ] **Step 3: Write scratch conversion tests**

Cover conversion to note and task, confirmation before destructive deletion, and preservation after server failure.

- [ ] **Step 4: Implement scratch composer**

Start with the prompt “무슨 생각을 하고 있나요?” and create the server record on first non-empty input. Subsequent changes PATCH the same record.

- [ ] **Step 5: Implement note list and editor**

P0 editor supports Markdown-like plain text with a small formatting toolbar that inserts syntax for headings, lists, checklists, links, bold, and code fences. Store plain text only and render preview safely.

- [ ] **Step 6: Implement `/notes` and `/my/notes`**

`/notes` shows active-team notes/scratches. `/my/notes` shows personal notes/scratches.

- [ ] **Step 7: Run tests and commit**

```bash
npx vitest run src/components/notes --config vitest.config.mts
git add src/components/notes 'src/app/(frontend)/notes' 'src/app/(frontend)/my/notes'
git commit -m "feat: add notes and autosaving scratchpad"
```

### Task 12: Build public team chat UI

**Files:**
- Create: `src/components/chat/chat-room.tsx`
- Create: `src/components/chat/message-list.tsx`
- Create: `src/components/chat/message-item.tsx`
- Create: `src/components/chat/message-composer.tsx`
- Create: `src/components/chat/linkified-text.tsx`
- Create: `src/app/(frontend)/chat/page.tsx`
- Test: `src/components/chat/chat-room.test.tsx`
- Test: `src/components/chat/linkified-text.test.tsx`

- [ ] **Step 1: Write safe linkification tests**

Assert HTTP/HTTPS links become anchors with `rel="noreferrer noopener"`, malformed protocols remain text, and HTML input is rendered as text.

- [ ] **Step 2: Implement safe plain-text rendering**

Split text by URL regex and create React nodes. Do not use `dangerouslySetInnerHTML`.

- [ ] **Step 3: Write chat room tests**

Cover initial load, send, optimistic pending state, failed-send retry, edit, delete, reaction, empty state, long wrapping, and polling cleanup.

- [ ] **Step 4: Implement chat room**

Poll every 5 seconds while the tab is visible. Pause when hidden. Append only messages after the latest ID/timestamp and keep scroll position unless the user is already near the bottom.

- [ ] **Step 5: Implement `/chat`**

Require an active team. Show a team-creation empty state when none exists.

- [ ] **Step 6: Run tests and commit**

```bash
npx vitest run src/components/chat --config vitest.config.mts
git add src/components/chat 'src/app/(frontend)/chat'
git commit -m "feat: add public team chat"
```

### Task 13: Build workspace home and recent projects

**Files:**
- Create: `src/lib/workspace/home-service.ts`
- Create: `src/components/home/workspace-home.tsx`
- Create: `src/components/home/task-summary-card.tsx`
- Create: `src/components/home/recent-chat-card.tsx`
- Create: `src/components/home/recent-notes-card.tsx`
- Create: `src/components/home/recent-projects-card.tsx`
- Modify: `src/app/(frontend)/page.tsx`
- Create: `src/app/(frontend)/projects/recent/page.tsx`
- Modify: `src/lib/projects/service.ts`
- Test: `tests/int/home-service.int.spec.ts`
- Test: `src/components/home/workspace-home.test.tsx`

- [ ] **Step 1: Write home aggregation tests**

Assert:

- only current user personal tasks are included
- only active team shared records are included
- recent lists are limited and ordered by update time
- no active team still returns personal sections
- project access remains owner-or-team-member

- [ ] **Step 2: Fix project service authorization before aggregation**

Add explicit `requireProjectAccess()` checks to:

- `getProject`
- source CRUD
- compile/run operations
- document save
- revision read
- rename/move/archive/delete

Do not rely on collection access being applied by Local API.

- [ ] **Step 3: Implement home service**

Return:

```ts
type WorkspaceHomeData = {
  greetingName: string
  personalTasks: WorkspaceTaskView[]
  teamTasks: WorkspaceTaskView[]
  recentMessages: ChatMessageView[]
  recentNotes: WorkspaceNoteView[]
  recentProjects: ProjectSummary[]
}
```

- [ ] **Step 4: Write home component tests**

Cover greeting, counts, direct links, quick create, empty states, teamless personal mode, and cards with actual records rather than metric-only tiles.

- [ ] **Step 5: Replace root redirect with workspace home**

`/` must require app authentication and render the new home.

- [ ] **Step 6: Add recent projects route**

Use existing project list patterns with a recent-only sort/limit. Preserve project search, archive, and team filtering on `/projects`.

- [ ] **Step 7: Run tests and commit**

```bash
npx vitest run tests/int/home-service.int.spec.ts src/components/home --config vitest.config.mts
git add src/lib/workspace/home-service.ts src/lib/projects/service.ts src/components/home 'src/app/(frontend)/page.tsx' 'src/app/(frontend)/projects/recent'
git commit -m "feat: add workspace home"
```

### Task 14: Integrate quick-create forms and navigation

**Files:**
- Modify: `src/components/workspace-global/quick-create.tsx`
- Modify: `src/components/tasks/task-form.tsx`
- Modify: `src/components/notes/note-form.tsx`
- Modify: `src/components/notes/scratch-composer.tsx`
- Modify: `src/components/projects/new-project-form.tsx`
- Modify: `src/app/(frontend)/projects/page.tsx`
- Modify: `src/app/(frontend)/projects/new/page.tsx`
- Modify: `src/app/(frontend)/profile/page.tsx`
- Modify: `src/app/(frontend)/teams/new/page.tsx`
- Modify: `src/app/(frontend)/teams/[teamId]/page.tsx`
- Test: `src/components/workspace-global/quick-create.integration.test.tsx`

- [ ] **Step 1: Write integration tests**

For each quick-create type, assert successful POST, dialog close, page preservation, and refresh event. Verify selected active team is included for team records and omitted for personal records.

- [ ] **Step 2: Connect forms to quick create**

Project quick create requires only name and active team. Preserve the full `/projects/new` source-upload workflow for users who choose “자세히 만들기”.

- [ ] **Step 3: Remove duplicated page headers**

Pages inside the global shell must not render separate brand/profile/logout headers. Keep project editor’s internal layout unchanged.

- [ ] **Step 4: Run integration tests and commit**

```bash
npx vitest run src/components/workspace-global/quick-create.integration.test.tsx --config vitest.config.mts
git add src/components 'src/app/(frontend)'
git commit -m "feat: integrate workspace navigation and quick create"
```

### Task 15: Add responsive workspace styling

**Files:**
- Modify: `src/app/(frontend)/styles.css`
- Test: browser verification in Task 17

- [ ] **Step 1: Add global shell tokens and layout**

Reuse existing colors and introduce only semantic aliases:

```css
:root {
  --workspace-sidebar-width: 240px;
  --workspace-content-max: 1180px;
  --focus-ring: 0 0 0 3px color-mix(in srgb, var(--accent) 28%, transparent);
}
```

- [ ] **Step 2: Add card/list/form states**

Style loading, empty, error, optimistic, disabled, hover, focus, and completion states. Ensure touch targets are at least 44px.

- [ ] **Step 3: Add responsive behavior**

- desktop: persistent sidebar
- tablet: collapsible sidebar drawer
- mobile: compact top bar, scrollable content, full-width dialogs
- project editor: preserve current responsive behavior

- [ ] **Step 4: Respect reduced motion**

Disable non-essential transitions under `prefers-reduced-motion`.

- [ ] **Step 5: Commit**

```bash
git add 'src/app/(frontend)/styles.css'
git commit -m "style: add responsive workspace interface"
```

### Task 16: Add regression and authorization tests

**Files:**
- Modify: `tests/int/collections.int.spec.ts`
- Create: `tests/int/workspace-authorization.int.spec.ts`
- Modify: `tests/e2e/frontend.e2e.spec.ts`
- Modify: `tests/helpers/seedUser.ts`

- [ ] **Step 1: Add complete authorization matrix**

Verify:

- non-member cannot read team chat
- another user cannot read personal note
- another user cannot read personal task
- team member can read team note
- team records do not leak across teams
- project owner and team member retain project access

- [ ] **Step 2: Add P0 CRUD regression coverage**

Verify task, note, scratch conversion, and chat operations listed in the specification.

- [ ] **Step 3: Add existing feature regression checks**

E2E:

- login and signup forms submit and navigate
- home loads after login
- team switching persists
- project list loads
- project editor opens
- existing screen-flow navigation works
- compile control is present and a mocked/dev compilation completes

- [ ] **Step 4: Run test suites**

```bash
npm run test:int
npm run test:e2e
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests
git commit -m "test: cover workspace permissions and regressions"
```

### Task 17: Final static and browser verification

**Files:**
- Modify only files required by observed failures.

- [ ] **Step 1: Run type-aware test suite**

```bash
npm run test:int
```

Expected: PASS.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: exit code 0. Existing warnings must be reported; new warnings in changed files must be fixed.

- [ ] **Step 3: Run production build**

```bash
npm run build
```

Expected: Next.js production build completes with no TypeScript error.

- [ ] **Step 4: Run browser QA**

Check desktop and mobile widths for:

- login → workspace home
- active team selection
- personal task creation
- team task assignment
- note creation
- scratch autosave and conversion
- chat send/edit/delete/reaction
- recent project navigation
- existing SpecFlow editor
- empty, loading, and failed-network states
- keyboard navigation and focus visibility
- browser console and failed network requests

- [ ] **Step 5: Inspect Git diff and secret exposure**

```bash
git status --short
git diff --check
git diff --stat
git grep -nE '(sk-|api[_-]?key|password\\s*=)' -- ':!package-lock.json' ':!pnpm-lock.yaml'
```

Confirm no unrelated user changes were removed and no credentials are tracked.

### Task 18: Deploy, canary-check, commit, and push

This task is authorized by the user’s standing instruction to deploy and push after code changes. Do not run it until Tasks 1–17 pass.

**Files:**
- No planned source changes.

- [ ] **Step 1: Deploy production**

```bash
npx @payloadcms/figma@latest deploy
```

Expected: production deployment succeeds and returns the Figma site URL.

- [ ] **Step 2: Verify deployed login and home**

Open:

```text
https://workflowos.figma.site/login
https://workflowos.figma.site/
```

Verify login completes, home renders, and no infinite loading occurs.

- [ ] **Step 3: Commit any final verified fixes**

```bash
git add <only verified P0 files>
git commit -m "feat: add lightweight team workspace"
```

Skip this commit if all changes were already committed task-by-task and the worktree is clean.

- [ ] **Step 4: Push current branch**

```bash
git push origin main
```

Expected: remote `main` advances without force push.

## Final report checklist

Report:

- current structure and changed IA
- implemented P0 features
- collection and relationship changes
- Payload and service-layer authorization policy
- exact changed files
- `npm run test:int` result
- `npm run lint` result
- `npm run build` result
- browser regression result
- deployment URL and deployment result
- pushed commit hash
- P1 follow-up scope

## Self-review

- Spec coverage: all P0-1 through P0-4 requirements map to Tasks 1–17.
- Security coverage: Payload access plus service-layer validation is explicit for team and personal records.
- Existing feature preservation: project editor is left project-local and receives dedicated regression coverage.
- P1 separation: resources, search, activities, threads, previews, favorites, notifications, and images are not falsely marked complete.
- Type consistency: collection fields use Payload names (`team`, `project`, `createdBy`) while API inputs use explicit IDs (`teamId`, `projectId`).
- No placeholders: every implementation task names concrete files, APIs, tests, commands, and expected outcomes.
