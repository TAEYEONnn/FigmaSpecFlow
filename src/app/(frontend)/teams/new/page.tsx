import Link from "next/link";
import { CreateTeamForm } from "@/components/teams/create-team-form";
import { LogoutButton } from "@/components/auth/logout-button";

export default function NewTeamPage() {
  return (
    <main className="projects-page">
      <header className="projects-header">
        <Link className="brand" href="/projects">
          <span className="brand-mark" aria-hidden />
          <span>SpecFlow OS</span>
        </Link>
        <LogoutButton />
      </header>
      <section className="new-project-shell">
        <h1>새 팀 만들기</h1>
        <p>팀을 만들고 팀원을 초대해서 프로젝트를 함께 관리해요.</p>
        <CreateTeamForm />
      </section>
    </main>
  );
}
