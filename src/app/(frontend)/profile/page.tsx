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
  const acc = account as unknown as Record<string, unknown>;
  const isAdmin = (acc.role as string) === 'admin';

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
          initialDisplayName={(acc.displayName as string) ?? ""}
          email={auth.username}
        />
        {isAdmin && (
          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--line)' }}>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px' }}>관리 도구</p>
            <a
              href="/admin"
              target="_blank"
              rel="noreferrer"
              className="button button-ghost button-sm"
            >
              관리자 화면 열기 ↗
            </a>
          </div>
        )}
      </section>
    </main>
  );
}
