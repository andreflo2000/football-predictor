import type { Metadata } from 'next'
import { Barlow_Condensed, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const barlow = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-display',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'FootPredict — AI Football Predictions',
  description: 'Predicții fotbal bazate pe xG, Elo ratings și XGBoost',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro" className={`${barlow.variable} ${jetbrains.variable}`}>
      <body className="bg-[#050f08] text-white antialiased">{children}</body>
    </html>
  )
}
