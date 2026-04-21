import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Istoric & Performanță — Acuratețe Verificată | Oxiano Football Analytics',
  description: 'Rezultatele reale ale predicțiilor Oxiano, verificate out-of-sample. 86.1% acuratețe La Liga, 79.4% Bundesliga și Ligue 1 la confidence ≥65%. Nu ștergem picks-urile pierdute.',
  keywords: [
    'track record predicții fotbal', 'acuratețe predicții fotbal', 'rezultate predicții AI',
    'football predictions accuracy', 'verified football predictions', 'pronosticuri verificate fotbal',
  ],
  alternates: { canonical: 'https://oxiano.com/track-record' },
  openGraph: {
    title: 'Track Record Oxiano — Acuratețe Verificată',
    description: '86.1% acuratețe La Liga · 79.4% Bundesliga · Rezultate reale, nevizualizate',
    url: 'https://oxiano.com/track-record',
  },
}

export default function TrackRecordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
