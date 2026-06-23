import Link from "next/link";
import { ProjectList } from "@/components/projects/project-list";
import { LogoutButton } from "@/components/auth/logout-button";
import { listProjects } from "@/lib/projects/service";
import { listMyTeams } from "@/lib/teams/service";

export default async function ProjectsPage() {
  const [projects, teams] = await Promise.all([listProjects(), listMyTeams().catch(() => [])]);
  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <span>SpecFlow OS</span>
        </div>
        <nav className="header-team-nav">
          {teams.map((t) => (
            <Link key={t.id} className="button button-ghost button-sm" href={`/teams/${t.id}`}>
              {t.name}
            </Link>
          ))}
          <Link className="button button-ghost button-sm" href="/teams/new">+ 팀</Link>
        </nav>
        <Link className="button button-ghost button-sm" href="/profile">프로필</Link>
        <LogoutButton />
      </header>
      <section className="projects-main">
        <ProjectList projects={projects} />
      </section>
    </main>
  );
}
