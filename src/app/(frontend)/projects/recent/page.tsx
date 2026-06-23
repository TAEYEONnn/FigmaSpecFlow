import Link from 'next/link'
import { ArrowRight } from '@phosphor-icons/react/dist/ssr'

import { requireAuthContext } from '@/lib/auth/context'
import { formatKoreanDateTime } from '@/lib/format-date'
import { listProjects } from '@/lib/projects/service'

export default async function RecentProjectsPage() {
  await requireAuthContext()
  const projects = (await listProjects()).slice(0, 12)
  return (
    <main className="workspace-page">
      <header className="workspace-page-header">
        <p><Link href="/projects">← 프로젝트 목록</Link></p>
        <h1>최근 프로젝트</h1>
        <span>최근 수정한 프로젝트부터 이어서 작업하세요.</span>
      </header>
      <div className="workspace-list">
        {projects.map((project) => (
          <Link className="project-row" href={`/projects/${project.id}`} key={project.id}>
            <div><strong>{project.name}</strong><span>문서 버전 {project.revision}</span></div>
            <span>{formatKoreanDateTime(project.updatedAt)}</span>
            <ArrowRight size={18} />
          </Link>
        ))}
        {projects.length === 0 && <div className="workspace-empty">아직 프로젝트가 없어요.</div>}
      </div>
    </main>
  )
}
