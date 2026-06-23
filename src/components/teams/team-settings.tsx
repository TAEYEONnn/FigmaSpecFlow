"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Member = { id: string; userId: string; email: string; role: "owner" | "member" };
type Invitation = { id: string; email: string; role: "owner" | "member"; token: string; expiresAt: string };

export function TeamSettings({
  teamId,
  teamName,
  ownerId,
  myUserId,
  initialMembers,
  initialInvitations,
}: {
  teamId: string;
  teamName: string;
  ownerId: string;
  myUserId: string;
  initialMembers: Member[];
  initialInvitations: Invitation[];
}) {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [invitePending, setInvitePending] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const isOwner = myUserId === ownerId;

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    if (invitePending || !inviteEmail.trim()) return;
    setInviteError("");
    setInviteLink("");
    setInvitePending(true);

    try {
      const res = await fetch(`/api/teams/${teamId}/invitations`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setInviteError(data.error ?? "초대를 보내지 못했어요."); return; }
      const token: string = data.invitation?.token ?? "";
      const link = `${window.location.origin}/invitations/${token}`;
      setInviteLink(link);
      setInviteEmail("");
      setInvitations((prev) => [
        ...prev,
        { id: data.invitation.id ?? "", email: inviteEmail.trim(), role: "member", token, expiresAt: data.invitation.expiresAt ?? "" },
      ]);
    } catch {
      setInviteError("네트워크 연결을 확인해 주세요.");
    } finally {
      setInvitePending(false);
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm("이 멤버를 팀에서 제거할까요?")) return;
    const res = await fetch(`/api/teams/${teamId}/members/${userId}`, { method: "DELETE" });
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
      router.refresh();
    }
  }

  return (
    <div className="team-settings">
      <h1 className="team-settings-title">{teamName}</h1>

      <section className="team-section">
        <h2>멤버 ({members.length}명)</h2>
        <ul className="member-list">
          {members.map((m) => (
            <li key={m.id} className="member-item">
              <span className="member-email">{m.email}</span>
              <span className={`member-role member-role--${m.role}`}>
                {m.role === "owner" ? "소유자" : "멤버"}
              </span>
              {isOwner && m.userId !== myUserId && (
                <button
                  className="button button-ghost button-sm"
                  onClick={() => handleRemove(m.userId)}
                >
                  제거
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {isOwner && (
        <section className="team-section">
          <h2>팀원 초대</h2>
          <form className="invite-form" onSubmit={handleInvite}>
            <input
              className="field"
              type="email"
              placeholder="초대할 이메일 주소"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              disabled={invitePending}
              required
            />
            <button className="button button-primary" type="submit" disabled={invitePending}>
              {invitePending ? "초대 중…" : "초대 링크 생성"}
            </button>
          </form>
          {inviteError && <p className="form-error">{inviteError}</p>}
          {inviteLink && (
            <div className="invite-link-box">
              <p>초대 링크가 생성됐어요. 복사해서 전달해 주세요.</p>
              <div className="invite-link-row">
                <input className="field" readOnly value={inviteLink} onClick={(e) => (e.target as HTMLInputElement).select()} />
                <button
                  className="button"
                  type="button"
                  onClick={() => navigator.clipboard.writeText(inviteLink)}
                >
                  복사
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {invitations.length > 0 && (
        <section className="team-section">
          <h2>대기 중인 초대 ({invitations.length})</h2>
          <ul className="member-list">
            {invitations.map((inv) => (
              <li key={inv.id} className="member-item">
                <span className="member-email">{inv.email}</span>
                <span className="member-role member-role--pending">대기 중</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
