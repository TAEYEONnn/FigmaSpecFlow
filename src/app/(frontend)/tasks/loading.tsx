const s = { background: 'var(--surface-raised, #f1f3f5)', borderRadius: 6 } as const

export default function TasksLoading() {
  return (
    <main className="workspace-page" role="status" aria-label="할 일 불러오는 중" aria-busy="true">
      <header className="workspace-page-header">
        <div style={{ ...s, width: 80, height: 28 }} />
      </header>
      <div className="workspace-list" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', alignItems: 'center' }}>
            <div style={{ ...s, width: 20, height: 20, borderRadius: 4, flexShrink: 0 }} />
            <div style={{ ...s, flex: 1, height: 18 }} />
            <div style={{ ...s, width: 48, height: 18 }} />
          </div>
        ))}
      </div>
    </main>
  )
}
