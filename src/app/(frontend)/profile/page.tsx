import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuthContext } from "@/lib/auth/context";
import { ProfileForm } from "@/components/auth/profile-form";
import { getPayload } from "payload";
import config from "@payload-config";

export default async function ProfilePage() {
  const auth = await requireAuthContext().catch(() => null);
  if (!auth) redirect("/login?next=/profile");

  const payload = await getPayload({ config });
  const account = await payload.findByID({ collection: "accounts", id: auth.userId });

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <span>SpecFlow OS</span>
        </div>
        <Link className="button button-ghost button-sm" href="/projects">
          ← 프로젝트 목록
        </Link>
      </header>
      <section className="new-project-shell">
        <h1>프로필 설정</h1>
        <ProfileForm
          initialDisplayName={(account as unknown as Record<string, unknown>).displayName as string ?? ""}
          email={auth.username}
        />
      </section>
    </main>
  );
}
