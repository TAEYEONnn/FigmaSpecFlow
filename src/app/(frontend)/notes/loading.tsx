const s = { background: 'var(--surface-raised, #f1f3f5)', borderRadius: 6 } as const

export default function NotesLoading() {
  return (
    <main className="workspace-page" role="status" aria-label="메모 불러오는 중" aria-busy="true">
      <header className="workspace-page-header">
        <div style={{ ...s, width: 60, height: 28 }} />
      </header>
      <div className="workspace-list" aria-hidden="true">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="project-row">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              <div style={{ ...s, width: 160, height: 18 }} />
              <div style={{ ...s, width: '80%', height: 14 }} />
            </div>
            <div style={{ ...s, width: 80, height: 14 }} />
          </div>
        ))}
      </div>
    </main>
  )
}
