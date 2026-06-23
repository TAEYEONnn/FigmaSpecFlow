"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Member = { id: string; userId: string; email: string; role: "owner" | "member" };
type Invitation = { id: string; email: string; role: "owner" | "member"; token: string; expiresAt: string };

export function TeamSettings({
  teamId,
  teamName: initialTeamName,
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

  // Team rename state
  const [teamName, setTeamName] = useState(initialTeamName);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(initialTeamName);
  const [renameError, setRenameError] = useState("");
  const [renamePending, setRenamePending] = useState(false);

  const isOwner = myUserId === ownerId;

  async function handleRename(event: FormEvent) {
    event.preventDefault();
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === teamName) { setIsRenaming(false); return; }
    setRenamePending(true);
    setRenameError("");
    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) { setRenameError(data.error ?? "이름을 바꾸지 못했어요."); return; }
      setTeamName(trimmed);
      setIsRenaming(false);
      router.refresh();
    } catch {
      setRenameError("네트워크 연결을 확인해 주세요.");
    } finally {
      setRenamePending(false);
    }
  }

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

  async function handleCancelInvitation(invitationId: string) {
    if (!confirm("이 초대를 취소할까요?")) return;
    const res = await fetch(`/api/teams/${teamId}/invitations/${invitationId}`, { method: "DELETE" });
    if (res.ok) {
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    }
  }

  return (
    <div className="team-settings">
      {isRenaming ? (
        <form className="rename-form" onSubmit={handleRename}>
          <input
            className="field rename-field"
            value={renameValue}
            autoFocus
            maxLength={100}
            onChange={(e) => setRenameValue(e.target.value)}
            disabled={renamePending}
          />
          <button className="button button-primary button-sm" type="submit" disabled={renamePending}>
            {renamePending ? "저장 중…" : "저장"}
          </button>
          <button
            className="button button-ghost button-sm"
            type="button"
            onClick={() => { setIsRenaming(false); setRenameValue(teamName); setRenameError(""); }}
          >
            취소
          </button>
          {renameError && <p className="form-error">{renameError}</p>}
        </form>
      ) : (
        <div className="team-title-row">
          <h1 className="team-settings-title">{teamName}</h1>
          {isOwner && (
            <button
              className="button button-ghost button-sm"
              onClick={() => { setRenameValue(teamName); setIsRenaming(true); }}
            >
              이름 수정
            </button>
          )}
        </div>
      )}

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
                {isOwner && (
                  <button
                    className="button button-ghost button-sm"
                    onClick={() => handleCancelInvitation(inv.id)}
                  >
                    취소
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
