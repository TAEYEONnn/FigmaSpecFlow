"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ensureBrowserStorageAccess } from "@/lib/auth/storage-access";

export function LoginForm({
  isDemo = false,
  next,
}: {
  isDemo?: boolean;
  next?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    await ensureBrowserStorageAccess();
    setError("");
    setPending(true);

    const fd = new FormData(event.currentTarget);
    const username = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password, ...(next ? { next } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "아이디 또는 비밀번호를 확인해 주세요.");
        return;
      }
      const redirectTo = (data.redirectTo && String(data.redirectTo).startsWith("/"))
        ? data.redirectTo
        : (next && next.startsWith("/") ? next : "/projects");
      router.push(redirectTo);
    } catch {
      setError("네트워크 연결을 확인해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      {isDemo ? (
        <p className="login-mode-badge" role="status">
          데모 모드
        </p>
      ) : null}
      <label className="field-label" htmlFor="login-email">
        아이디
        <input
          id="login-email"
          className="field"
          name="email"
          type="email"
          autoComplete="username"
          required
          placeholder="you@example.com"
          disabled={pending}
        />
      </label>
      <label className="field-label" htmlFor="login-password">
        비밀번호
        <input
          id="login-password"
          className="field"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
        />
      </label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="button button-primary" type="submit" disabled={pending}>
        {pending ? (
          <><span className="btn-spinner" aria-hidden="true" />로그인 중…</>
        ) : "로그인"}
      </button>
      <p style={{ textAlign: "center", marginTop: "12px", fontSize: "14px", color: "var(--fg-muted)" }}>
        아직 계정이 없나요?{" "}
        <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"} style={{ color: "var(--accent)" }}>가입하기</Link>
      </p>
    </form>
  );
}
