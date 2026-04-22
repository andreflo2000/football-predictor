import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tipuri de Analize Statistice în Fotbal | Oxiano',
  description: 'Ghid complet al tipurilor de rezultate statistice analizate de modelul Oxiano: 1X2, Over/Under, BTTS, Handicap Asiatic, Clean Sheet, Victorie la Zero și altele.',
  keywords: [
    'analiză statistică fotbal', 'tipuri rezultate fotbal', 'over under fotbal', 'btts fotbal',
    'handicap asiatic fotbal', 'clean sheet fotbal', 'victorie la zero fotbal', 'analiza meciuri fotbal AI',
  ],
  alternates: { canonical: 'https://oxiano.com/ghid-piete' },
  openGraph: {
    title: 'Tipuri de Analize Statistice în Fotbal | Oxiano',
    description: 'Ghid complet al celor 10 tipuri de rezultate statistice analizate de modelul Oxiano.',
    url: 'https://oxiano.com/ghid-piete',
  },
}

export default function GhidPieteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
