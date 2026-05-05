import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Istoric & Performanță — Acuratețe Verificată | Oxiano Football Analytics',
  description: 'Rezultatele reale ale predicțiilor Oxiano, verificate out-of-sample. 62–67% acuratețe pe picks cu confidence ≥65% pe eșantionul de validare. Nu ștergem picks-urile pierdute.',
  keywords: [
    'track record predicții fotbal', 'acuratețe predicții fotbal', 'rezultate predicții AI',
    'football predictions accuracy', 'verified football predictions', 'pronosticuri verificate fotbal',
  ],
  alternates: { canonical: 'https://oxiano.com/track-record' },
  openGraph: {
    title: 'Track Record Oxiano — Acuratețe Verificată',
    description: '62–67% acuratețe pe picks ≥65% conf. · Rezultate reale, verificate out-of-sample',
    url: 'https://oxiano.com/track-record',
  },
}

export default function TrackRecordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
