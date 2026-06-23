import React from 'react'
import './styles.css'
import { GlobalWorkspaceShell } from '@/components/workspace-global/workspace-shell'

export const metadata = {
  description: 'Turn source material into structured product specifications.',
  title: 'SpecFlow OS',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="ko">
      <body>
        <GlobalWorkspaceShell>{children}</GlobalWorkspaceShell>
      </body>
    </html>
  )
}
