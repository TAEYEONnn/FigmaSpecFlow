import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/components/auth/login-form";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("@/lib/auth/storage-access", () => ({
  ensureBrowserStorageAccess: vi.fn().mockResolvedValue(true),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("submits JSON with credentials:include — no FormData", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "아이디 또는 비밀번호를 확인해 주세요." }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    );

    render(<LoginForm />);
    await user.type(screen.getByLabelText("아이디"), "designer");
    await user.type(screen.getByLabelText("비밀번호"), "wrong");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
        body: JSON.stringify({ username: "designer", password: "wrong" }),
      }),
    );

    // Body must NOT be FormData
    const [, opts] = vi.mocked(fetch).mock.calls[0];
    expect(opts?.body).toBeTypeOf("string");
  });

  it("shows error message on 401", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "아이디 또는 비밀번호를 확인해 주세요." }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    );

    render(<LoginForm />);
    await user.type(screen.getByLabelText("아이디"), "designer");
    await user.type(screen.getByLabelText("비밀번호"), "wrong");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    expect(await screen.findByText("아이디 또는 비밀번호를 확인해 주세요.")).toBeTruthy();
  });

  it("resets loading state on 400/401/500 responses", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "서버 오류" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      }),
    );

    render(<LoginForm />);
    await user.type(screen.getByLabelText("아이디"), "a@b.com");
    await user.type(screen.getByLabelText("비밀번호"), "pass");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "로그인" })).not.toBeDisabled(),
    );
  });

  it("resets loading state on fetch reject (network error)", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockRejectedValue(new Error("Network failed"));

    render(<LoginForm />);
    await user.type(screen.getByLabelText("아이디"), "a@b.com");
    await user.type(screen.getByLabelText("비밀번호"), "pass");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "로그인" })).not.toBeDisabled(),
    );
  });

  it("resets loading state on non-JSON error response", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response("Internal Server Error", { status: 503 }),
    );

    render(<LoginForm />);
    await user.type(screen.getByLabelText("아이디"), "a@b.com");
    await user.type(screen.getByLabelText("비밀번호"), "pass");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "로그인" })).not.toBeDisabled(),
    );
  });

  it("prevents double submission while pending", async () => {
    const user = userEvent.setup();
    let resolveFirst!: () => void;
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFirst = () =>
            resolve(
              new Response(JSON.stringify({}), {
                status: 200,
                headers: { "content-type": "application/json" },
              }),
            );
        }),
    );

    render(<LoginForm />);
    await user.type(screen.getByLabelText("아이디"), "a@b.com");
    await user.type(screen.getByLabelText("비밀번호"), "pass");
    const btn = screen.getByRole("button", { name: "로그인" });
    await user.click(btn);
    // Button is now disabled — second click should be a no-op
    expect(btn).toBeDisabled();
    resolveFirst();
    // fetch called exactly once
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("renders exactly one submit button", () => {
    render(<LoginForm />);
    expect(screen.getAllByRole("button", { name: /로그인/ })).toHaveLength(1);
  });

  it("does NOT render a signup CTA inside LoginForm (belongs to page)", () => {
    render(<LoginForm />);
    // /signup link must not exist inside the form component itself
    const signupLinks = screen.queryAllByRole("link", { name: /가입|계정 만들기|회원가입/i });
    expect(signupLinks).toHaveLength(0);
  });

  it("navigates once on success without refreshing", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ redirectTo: "/projects" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    render(<LoginForm />);
    await user.type(screen.getByLabelText("아이디"), "designer");
    await user.type(screen.getByLabelText("비밀번호"), "specflow");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    expect(push).toHaveBeenCalledOnce();
    expect(push).toHaveBeenCalledWith("/projects");
    expect(refresh).not.toHaveBeenCalled();
  });
});
