import { ProjectList } from "@/components/projects/project-list";
import { listProjects } from "@/lib/projects/service";
import { listMyTeams } from "@/lib/teams/service";
import { requireAuthContext } from "@/lib/auth/context";

export default async function ProjectsPage() {
  await requireAuthContext();
  const [projects, teams] = await Promise.all([listProjects(), listMyTeams().catch(() => [])]);
  return (
    <main className="workspace-page">
      <section>
        <ProjectList projects={projects} teams={teams.map((t) => ({ id: t.id, name: t.name }))} />
      </section>
    </main>
  );
}
