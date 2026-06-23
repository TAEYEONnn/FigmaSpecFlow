import { notFound } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { TeamSettings } from "@/components/teams/team-settings";
import { getTeam, listPendingInvitations } from "@/lib/teams/service";
import { requireAuthContext } from "@/lib/auth/context";

export default async function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const auth = await requireAuthContext();

  let team;
  try {
    team = await getTeam(teamId);
  } catch {
    notFound();
  }

  const invitations = await listPendingInvitations(teamId).catch(() => []);

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <span>SpecFlow OS</span>
        </div>
        <LogoutButton />
      </header>
      <section className="projects-main">
        <TeamSettings
          teamId={teamId}
          teamName={team.name}
          ownerId={team.ownerId}
          myUserId={auth.userId}
          initialMembers={team.members}
          initialInvitations={invitations}
        />
      </section>
    </main>
  );
}
