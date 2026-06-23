const s = { background: 'var(--surface-raised, #f1f3f5)', borderRadius: 6 } as const

export default function ChatLoading() {
  return (
    <div className="chat-room" role="status" aria-label="대화 불러오는 중" aria-busy="true">
      <div className="chat-messages" aria-hidden="true">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="chat-message" style={{ opacity: 1 - i * 0.15 }}>
            <div style={{ ...s, width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              <div style={{ ...s, width: 100, height: 14 }} />
              <div style={{ ...s, width: '70%', height: 16 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
