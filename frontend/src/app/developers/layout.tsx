import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Oxiano API — Integrare B2B analiză fotbal',
  description: 'Integrează modelul nostru XGBoost în platforma ta. API REST cu probability outputs, xG, Elo, market edge. Free tier disponibil. Enterprise white-label.',
  openGraph: {
    title: 'Oxiano API — Football Analytics B2B',
    description: 'Build on top of our quantitative football model. REST API with confidence scores, xG, Elo, Kelly %. Free, Analytics €299/mo, Enterprise.',
  },
}

export default function DevelopersLayout({ children }: { children: React.ReactNode }) {
  return children
}
