"use client"

export function BackToAppLink() {
  return (
    <div style={{ padding: '8px 16px 0' }}>
      <a
        href="/projects"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '13px',
          color: 'inherit',
          opacity: 0.7,
          textDecoration: 'none',
          padding: '6px 8px',
          borderRadius: '4px',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.7' }}
      >
        ← 앱으로 돌아가기
      </a>
    </div>
  )
}
