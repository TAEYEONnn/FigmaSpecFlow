'use client'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="workspace-page" role="alert">
      <header className="workspace-page-header">
        <h1>문제가 생겼어요.</h1>
        <p>{error.message || '예상치 못한 오류가 발생했습니다.'}</p>
      </header>
      <button className="button button-primary" onClick={reset}>다시 시도</button>
    </main>
  )
}
