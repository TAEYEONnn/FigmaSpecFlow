import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignupForm } from "@/components/auth/signup-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/auth/storage-access", () => ({
  ensureBrowserStorageAccess: vi.fn().mockResolvedValue(true),
}));

const assignMock = vi.fn();
Object.defineProperty(window, "location", {
  value: { assign: assignMock },
  writable: true,
});

describe("SignupForm", () => {
  beforeEach(() => {
    assignMock.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>, opts = {
    email: "new@example.com",
    password: "password1",
    confirm: "password1",
  }) {
    render(<SignupForm />);
    await user.type(screen.getByPlaceholderText("you@example.com"), opts.email);
    await user.type(screen.getByPlaceholderText("8자 이상"), opts.password);
    const confirmInputs = screen.getAllByDisplayValue("");
    await user.type(confirmInputs[confirmInputs.length - 1]!, opts.confirm);
    await user.click(screen.getByRole("button", { name: "계정 만들기" }));
  }

  it("submits JSON with credentials:include — no FormData", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await fillAndSubmit(user);

    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/signup",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
        body: JSON.stringify({ email: "new@example.com", password: "password1" }),
      }),
    );

    const [, opts] = vi.mocked(fetch).mock.calls[0];
    expect(opts?.body).toBeTypeOf("string");
  });

  it("shows error when passwords do not match (no fetch)", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 200 }));

    render(<SignupForm />);
    await user.type(screen.getByPlaceholderText("you@example.com"), "a@b.com");
    await user.type(screen.getByPlaceholderText("8자 이상"), "pass1");
    const inputs = screen.getAllByDisplayValue("");
    await user.type(inputs[inputs.length - 1]!, "pass2");
    await user.click(screen.getByRole("button", { name: "계정 만들기" }));

    expect(await screen.findByText("비밀번호가 일치하지 않아요.")).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows error on 400 response", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "이미 사용 중인 이메일이에요." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
    );

    await fillAndSubmit(user);
    expect(await screen.findByText("이미 사용 중인 이메일이에요.")).toBeTruthy();
  });

  it("resets loading state on 500 response", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "서버 오류" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      }),
    );

    await fillAndSubmit(user);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "계정 만들기" })).not.toBeDisabled(),
    );
  });

  it("resets loading state on fetch reject", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

    await fillAndSubmit(user);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "계정 만들기" })).not.toBeDisabled(),
    );
  });

  it("resets loading on non-JSON error response", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response("Bad Gateway", { status: 502 }),
    );

    await fillAndSubmit(user);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "계정 만들기" })).not.toBeDisabled(),
    );
  });

  it("prevents double submission while pending", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation(
      () => new Promise(() => {}), // never resolves
    );

    render(<SignupForm />);
    await user.type(screen.getByPlaceholderText("you@example.com"), "a@b.com");
    await user.type(screen.getByPlaceholderText("8자 이상"), "password1");
    const inputs = screen.getAllByDisplayValue("");
    await user.type(inputs[inputs.length - 1]!, "password1");
    const btn = screen.getByRole("button", { name: "계정 만들기" });
    await user.click(btn);

    expect(btn).toBeDisabled();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("renders exactly one submit button", () => {
    render(<SignupForm />);
    expect(screen.getAllByRole("button", { name: /계정 만들기/ })).toHaveLength(1);
  });

  it("navigates on success", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await fillAndSubmit(user);

    await waitFor(() => expect(assignMock).toHaveBeenCalledWith("/projects"));
  });
});
