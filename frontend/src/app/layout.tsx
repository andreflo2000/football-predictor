import type { Metadata, Viewport } from 'next'
import './globals.css'
import DisclaimerBanner from '@/components/DisclaimerBanner'
import GdprConsent from '@/components/GdprConsent'
import Onboarding from '@/components/Onboarding'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'Oxiano — Quantitative Football Analysis',
  description: 'AI-powered football predictions based on XGBoost, Elo ratings and market intelligence. La Liga 86% accuracy at high confidence.',
  keywords: ['quantitative football analysis', 'AI sports metrics', 'football predictions', 'xG model', 'La Liga predictions', 'Premier League predictions', 'sports intelligence SaaS'],
  authors: [{ name: 'Oxiano' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Oxiano',
  },
  openGraph: {
    title: 'Oxiano — Quantitative Football Analysis',
    description: 'AI-powered football predictions. La Liga: 86% accuracy at ≥65% confidence.',
    type: 'website',
    locale: 'ro_RO',
    url: 'https://oxiano.com',
    siteName: 'Oxiano',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Oxiano — Quantitative Football Analysis',
    description: 'AI football predictions. La Liga 86% accuracy.',
  },
  alternates: {
    canonical: 'https://oxiano.com',
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
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
      </head>
      <head>
        {/* Google Analytics — inlocuieste G-XXXXXXXXXX cu ID-ul tau din analytics.google.com */}
        {process.env.NEXT_PUBLIC_GA_ID && <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`} />
          <script dangerouslySetInnerHTML={{ __html: `
            window.dataLayer=window.dataLayer||[];
            function gtag(){dataLayer.push(arguments);}
            gtag('js',new Date());
            gtag('config','${process.env.NEXT_PUBLIC_GA_ID}',{anonymize_ip:true});
          `}} />
        </>}
      </head>
      <body style={{width: '100vw', overflowX: 'hidden', position: 'relative'}}>
        <Navbar />
        {children}
        <Onboarding />
        <GdprConsent />
        <DisclaimerBanner />
        <script dangerouslySetInnerHTML={{__html: `
          document.addEventListener('touchstart', function(e) {
            if (e.touches.length > 1) e.preventDefault();
          }, { passive: false });
          var lastTouch = 0;
          document.addEventListener('touchend', function(e) {
            var now = Date.now();
            if (now - lastTouch < 300) e.preventDefault();
            lastTouch = now;
          }, { passive: false });
        `}} />
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
