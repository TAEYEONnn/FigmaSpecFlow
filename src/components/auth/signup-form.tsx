"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ensureBrowserStorageAccess } from "@/lib/auth/storage-access";

export function SignupForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    await ensureBrowserStorageAccess();
    setError("");
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");

    if (password !== confirm) {
      setError("비밀번호가 일치하지 않아요.");
      setPending(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "계정을 만들지 못했어요.");
        return;
      }
      window.location.assign("/projects");
    } catch {
      setError("네트워크 연결을 확인해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <label className="field-label">
        이메일
        <input
          className="field"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          disabled={pending}
        />
      </label>
      <label className="field-label">
        비밀번호
        <input
          className="field"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          placeholder="8자 이상"
          disabled={pending}
        />
      </label>
      <label className="field-label">
        비밀번호 확인
        <input
          className="field"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          placeholder=""
          disabled={pending}
        />
      </label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="button button-primary" type="submit" disabled={pending}>
        {pending ? (
          <><span className="btn-spinner" aria-hidden="true" />가입 중…</>
        ) : "계정 만들기"}
      </button>
      <p style={{ textAlign: "center", marginTop: "12px", fontSize: "14px", color: "var(--fg-muted)" }}>
        이미 계정이 있나요?{" "}
        <Link href="/login" style={{ color: "var(--accent)" }}>로그인</Link>
      </p>
    </form>
  );
}
