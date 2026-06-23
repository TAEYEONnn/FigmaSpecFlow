"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ensureBrowserStorageAccess } from "@/lib/auth/storage-access";

export function LoginForm({
  isDemo = false,
  next,
}: {
  isDemo?: boolean;
  next?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    setPending(true);
    try {
      await ensureBrowserStorageAccess();
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: email.trim(), password, ...(next ? { next } : {}) }),
      });
      const contentType = res.headers.get("content-type") ?? "";
      const data = contentType.includes("application/json") ? await res.json() : null;
      if (!res.ok) {
        setError(data?.error ?? "아이디 또는 비밀번호를 확인해 주세요.");
        return;
      }
      const redirectTo =
        data?.redirectTo && String(data.redirectTo).startsWith("/")
          ? data.redirectTo
          : next && next.startsWith("/")
            ? next
            : "/projects";
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="button button-primary" type="submit" disabled={pending}>
        {pending ? (
          <><span className="btn-spinner" aria-hidden="true" />로그인 중…</>
        ) : "로그인"}
      </button>
    </form>
  );
}
