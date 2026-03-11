import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Flopi San — Forecast Academy',
  description: 'Predicții fotbal bazate pe xG, Elo și XGBoost. 100 ligi, 15 piețe de pariuri, clasament live, tracker pronosticuri.',
  keywords: ['predicții fotbal', 'football predictions', 'pariuri fotbal', 'xG', 'statistici fotbal', 'Premier League', 'La Liga'],
  authors: [{ name: 'Flopi San' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Flopi San',
  },
  openGraph: {
    title: 'Flopi San — Forecast Academy',
    description: 'Predicții fotbal AI cu xG, Elo și XGBoost. 100 ligi acoperite.',
    type: 'website',
    locale: 'ro_RO',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'msapplication-TileColor': '#1e40af',
    'theme-color': '#1e40af',
  },
}

export const viewport: Viewport = {
  themeColor: '#1e40af',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <head>
  <link rel="apple-touch-icon" href="/icons/icon-192.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-96.png" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
</head>
      <body>
        {children}
        <script dangerouslySetInnerHTML={{__html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(() => {});
            });
          }
        `}} />
      </body>
    </html>
  )
}
