import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blog & Analize Fotbal — Oxiano',
  description: 'Articole despre predicții fotbal AI, metodologie XGBoost, statistici avansate xG și analiză cantitativă a ligilor europene.',
  keywords: ['blog predicții fotbal', 'analize fotbal AI', 'statistici fotbal', 'xG fotbal', 'metodologie predicții'],
  alternates: { canonical: 'https://oxiano.com/blog' },
  openGraph: {
    title: 'Blog & Analize Fotbal — Oxiano',
    description: 'Articole despre predicții fotbal AI și analiză cantitativă.',
    url: 'https://oxiano.com/blog',
    siteName: 'Oxiano',
    locale: 'ro_RO',
    type: 'website',
  },
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children
}
