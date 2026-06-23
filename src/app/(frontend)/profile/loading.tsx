const s = { background: 'var(--surface-raised, #f1f3f5)', borderRadius: 6 } as const

export default function ProfileLoading() {
  return (
    <main className="workspace-page" role="status" aria-label="프로필 불러오는 중" aria-busy="true">
      <header className="workspace-page-header">
        <div style={{ ...s, width: 80, height: 28 }} />
      </header>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 480 }} aria-hidden="true">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ ...s, width: 80, height: 14 }} />
            <div style={{ ...s, width: '100%', height: 42, borderRadius: 8 }} />
          </div>
        ))}
        <div style={{ ...s, width: 120, height: 42, borderRadius: 8 }} />
      </div>
    </main>
  )
}
