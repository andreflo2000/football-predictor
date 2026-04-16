import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Despre Oxiano — Metodologie & Model AI | Quantitative Football Analysis',
  description: 'Cum funcționează Oxiano: model XGBoost antrenat pe 225.000 meciuri, 110 variabile, Elo ratings, xG și inteligență de piață Pinnacle. Acuratețe 86.1% La Liga la ≥65% confidence.',
  keywords: [
    'metodologie predicții fotbal', 'model AI fotbal', 'XGBoost fotbal',
    'Elo rating fotbal', 'expected goals model', 'quantitative football analysis',
    'football predictions machine learning', 'sports analytics model',
  ],
  alternates: { canonical: 'https://oxiano.com/despre' },
  openGraph: {
    title: 'Despre Oxiano — Model XGBoost + Elo + Poisson',
    description: '225.000 meciuri de antrenament · 110 variabile · 86.1% acuratețe La Liga',
    url: 'https://oxiano.com/despre',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Oxiano',
  url: 'https://oxiano.com',
  description: 'Platformă de analiză cantitativă fotbal bazată pe model XGBoost, Elo ratings și inteligență de piață. Antrenat pe 225.000 meciuri europene.',
  foundingDate: '2025',
  areaServed: 'Worldwide',
  knowsAbout: ['Football Analytics', 'Machine Learning', 'Sports Statistics', 'XGBoost', 'Elo Rating System'],
}

export default function DespreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {children}
    </>
  )
}
