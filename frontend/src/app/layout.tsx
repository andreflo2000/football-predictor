import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FootPredict — Predicții Fotbal AI',
  description: 'Predicții fotbal bazate pe xG, Elo și modele de machine learning',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body>{children}</body>
    </html>
  )
}
