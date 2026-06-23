import { notFound } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { ProjectOnboarding } from "@/components/workspace/project-onboarding";
import { getAuthContext } from "@/lib/auth/context";
import { getProject } from "@/lib/projects/service";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const auth = await getAuthContext();
  if (!auth) notFound();
  const project = await getProject(projectId, auth);
  if (!project) notFound();

  if (!project.document) {
    return (
      <ProjectOnboarding
        project={{ id: project.id, name: project.name, sources: project.sources }}
        username={auth.username}
      />
    );
  }

  return <WorkspaceShell project={{ ...project, document: project.document }} username={auth.username} />;
}
