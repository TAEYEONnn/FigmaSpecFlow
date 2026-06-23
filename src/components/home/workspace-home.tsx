"use client"

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, ChatCircleDots, CheckSquare, FolderSimple, Note, Plus } from '@phosphor-icons/react'

import { useActiveTeam } from '@/components/workspace-global/active-team-provider'
import type { ChatMessageView } from '@/lib/chat/service'
import type { WorkspaceNoteView } from '@/lib/notes/service'
import type { WorkspaceTaskView } from '@/lib/tasks/service'
import { formatKoreanDateTime } from '@/lib/format-date'

type ProjectSummary = {
  id: string
  name: string
  revision: number
  updatedAt: string
  teamId?: string | null
  teamName?: string | null
}

export function WorkspaceHome({
  username,
  projects,
}: {
  username: string
  projects: ProjectSummary[]
}) {
  const { activeTeam } = useActiveTeam()
  const [personalTasks, setPersonalTasks] = useState<WorkspaceTaskView[]>([])
  const [teamTasks, setTeamTasks] = useState<WorkspaceTaskView[]>([])
  const [messages, setMessages] = useState<ChatMessageView[]>([])
  const [notes, setNotes] = useState<WorkspaceNoteView[]>([])
  const [quickTask, setQuickTask] = useState('')
  const [quickNote, setQuickNote] = useState('')

  const load = useCallback(async () => {
    const requests: Promise<Response>[] = [
      fetch('/api/tasks?personal=true', { credentials: 'include' }),
    ]
    if (activeTeam) {
      requests.push(
        fetch(`/api/tasks?teamId=${activeTeam.id}`, { credentials: 'include' }),
        fetch(`/api/chat?teamId=${activeTeam.id}&limit=5`, { credentials: 'include' }),
        fetch(`/api/notes?teamId=${activeTeam.id}`, { credentials: 'include' }),
      )
    }
    const responses = await Promise.all(requests)
    const data = await Promise.all(responses.map((response) => response.json()))
    setPersonalTasks(data[0]?.tasks ?? [])
    if (activeTeam) {
      setTeamTasks(data[1]?.tasks ?? [])
      setMessages([...(data[2]?.messages ?? [])].reverse())
      setNotes(data[3]?.notes ?? [])
    } else {
      setTeamTasks([])
      setMessages([])
      setNotes([])
    }
  }, [activeTeam])

  useEffect(() => { load() }, [load])

  async function createQuick(
    kind: 'task' | 'note',
    value: string,
    clear: () => void,
  ) {
    if (!value.trim()) return
    const response = await fetch(kind === 'task' ? '/api/tasks' : '/api/notes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(kind === 'task' ? {
        title: value,
        isPersonal: true,
      } : {
        title: value,
        content: '',
        kind: 'note',
        visibility: 'personal',
      }),
    })
    if (response.ok) {
      clear()
      await load()
    }
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? '좋은 아침이에요' : hour < 18 ? '좋은 오후예요' : '좋은 저녁이에요'
  const displayName = username.split('@')[0]
  const activePersonalTasks = personalTasks.filter((task) => task.status !== 'done')
  const recentProjects = projects
    .filter((project) => !activeTeam || project.teamId === activeTeam.id)
    .slice(0, 5)

  return (
    <main className="workspace-page home-dashboard">
      <header className="home-greeting">
        <p>{greeting}, {displayName}님</p>
        <h1>오늘 뭐부터 할까요?</h1>
        <span>처리할 개인 할 일이 {activePersonalTasks.length}개 있어요.</span>
      </header>

      <section className="quick-create-panel">
        <h2>빠른 생성</h2>
        <div className="quick-create-grid">
          <label>
            <CheckSquare size={20} />
            <input value={quickTask} onChange={(event) => setQuickTask(event.target.value)} placeholder="내 할 일" />
            <button onClick={() => createQuick('task', quickTask, () => setQuickTask(''))}>추가</button>
          </label>
          <label>
            <Note size={20} />
            <input value={quickNote} onChange={(event) => setQuickNote(event.target.value)} placeholder="내 메모" />
            <button onClick={() => createQuick('note', quickNote, () => setQuickNote(''))}>추가</button>
          </label>
          <Link href="/notes"><Plus size={20} />낙서</Link>
          <Link href="/projects/new"><FolderSimple size={20} />프로젝트</Link>
        </div>
      </section>

      <div className="home-grid">
        <HomeCard title="내 할 일" href="/my/tasks" icon={<CheckSquare size={20} />}>
          {personalTasks.slice(0, 5).map((task) => <ListRow key={task.id} title={task.title} meta={task.status} />)}
          {personalTasks.length === 0 && <SmallEmpty>오늘 할 일을 모두 끝냈어요.</SmallEmpty>}
        </HomeCard>
        <HomeCard title="팀 할 일" href="/tasks" icon={<CheckSquare size={20} />}>
          {teamTasks.slice(0, 5).map((task) => <ListRow key={task.id} title={task.title} meta={`${task.priority} · ${task.status}`} />)}
          {teamTasks.length === 0 && <SmallEmpty>등록된 팀 할 일이 없어요.</SmallEmpty>}
        </HomeCard>
        <HomeCard title="최근 대화" href="/chat" icon={<ChatCircleDots size={20} />}>
          {messages.slice(-5).reverse().map((message) => (
            <ListRow key={message.id} title={message.content} meta={message.authorEmail} />
          ))}
          {messages.length === 0 && <SmallEmpty>먼저 한마디 남겨보세요.</SmallEmpty>}
        </HomeCard>
        <HomeCard title="최근 메모" href="/notes" icon={<Note size={20} />}>
          {notes.slice(0, 5).map((note) => <ListRow key={note.id} title={note.title || '제목 없는 낙서'} meta={formatKoreanDateTime(note.updatedAt)} />)}
          {notes.length === 0 && <SmallEmpty>팀 메모가 아직 없어요.</SmallEmpty>}
        </HomeCard>
        <section className="home-card home-card--wide">
          <header><div><FolderSimple size={20} /><h2>최근 프로젝트</h2></div><Link href="/projects/recent">모두 보기 <ArrowRight /></Link></header>
          {recentProjects.map((project) => (
            <Link className="home-project-row" href={`/projects/${project.id}`} key={project.id}>
              <div><strong>{project.name}</strong><span>{project.teamName || '개인 프로젝트'} · 문서 버전 {project.revision}</span></div>
              <time>{formatKoreanDateTime(project.updatedAt)}</time>
            </Link>
          ))}
          {recentProjects.length === 0 && <SmallEmpty>최근 프로젝트가 없어요.</SmallEmpty>}
        </section>
      </div>
    </main>
  )
}

function HomeCard({ title, href, icon, children }: { title: string; href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section className="home-card"><header><div>{icon}<h2>{title}</h2></div><Link href={href}>열기 <ArrowRight /></Link></header><div>{children}</div></section>
}

function ListRow({ title, meta }: { title: string; meta: string }) {
  return <div className="home-list-row"><strong>{title}</strong><span>{meta}</span></div>
}

function SmallEmpty({ children }: { children: React.ReactNode }) {
  return <p className="home-small-empty">{children}</p>
}
