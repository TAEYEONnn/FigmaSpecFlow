import Link from "next/link";
import { ProjectList } from "@/components/projects/project-list";
import { LogoutButton } from "@/components/auth/logout-button";
import { listProjects } from "@/lib/projects/service";
import { listMyTeams } from "@/lib/teams/service";
import { requireAuthContext } from "@/lib/auth/context";

export default async function ProjectsPage() {
  await requireAuthContext();
  const [projects, teams] = await Promise.all([listProjects(), listMyTeams().catch(() => [])]);
  return (
    <main className="projects-page">
      <header className="projects-header">
        <Link className="brand" href="/projects">
          <span className="brand-mark" aria-hidden />
          <span>SpecFlow OS</span>
        </Link>
        <Link className="button button-ghost button-sm" href="/teams/new">+ 팀</Link>
        <Link className="button button-ghost button-sm" href="/profile">프로필</Link>
        <LogoutButton />
      </header>
      <section className="projects-main">
        <ProjectList projects={projects} teams={teams.map((t) => ({ id: t.id, name: t.name }))} />
      </section>
    </main>
  );
}
