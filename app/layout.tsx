import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Философский канон',
  description: '121 главная книга по философии — от Платона до наших дней',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body style={{ margin: 0, background: 'var(--paper)', color: 'var(--ink)' }}>
        {children}
      </body>
    </html>
  )
}
