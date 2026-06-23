export function LoginForm({
  error,
  isDemo = false,
  next,
}: {
  error?: string
  isDemo?: boolean
  next?: string
}) {
  return (
    <form
      action="/api/auth/login"
      className="login-form"
      method="post"
    >
      {next && <input type="hidden" name="next" value={next} />}
      {isDemo ? (
        <p className="login-mode-badge" role="status">
          데모 모드
        </p>
      ) : null}
      <label className="field-label">
        아이디
        <input
          className="field"
          name="email"
          autoComplete="username"
          required
          placeholder="you@example.com"
        />
      </label>
      <label className="field-label">
        비밀번호
        <input
          className="field"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="button button-primary" type="submit">
        로그인
      </button>
    </form>
  )
}
