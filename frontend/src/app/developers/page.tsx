'use client'
import { useLang } from '@/lib/LangContext'

const TIERS = [
  {
    id: 'free',
    nameRo: 'Free',
    nameEn: 'Free',
    price: '€0',
    period: '/lună',
    periodEn: '/month',
    highlight: false,
    featuresRo: [
      '100 req/zi',
      'Endpoint /fixtures (meciuri de azi)',
      'Endpoint /predictions (fără confidence)',
      'Rate limit: 1 req/s',
      'Fără SLA',
    ],
    featuresEn: [
      '100 req/day',
      'Endpoint /fixtures (today\'s matches)',
      'Endpoint /predictions (no confidence)',
      'Rate limit: 1 req/s',
      'No SLA',
    ],
    ctaRo: 'Înregistrare gratuită',
    ctaEn: 'Register free',
  },
  {
    id: 'analytics',
    nameRo: 'Analytics API',
    nameEn: 'Analytics API',
    price: '€299',
    period: '/lună',
    periodEn: '/month',
    highlight: true,
    featuresRo: [
      '50.000 req/lună',
      'Confidence scores complete (H/D/A + Kelly %)',
      'xG, Elo, form, market edge per meci',
      'Webhook push la picks noi (07:00 & 13:00)',
      'Istorical 12 luni',
      'Rate limit: 10 req/s',
      'SLA 99.5% uptime',
      'Suport email 48h',
    ],
    featuresEn: [
      '50,000 req/month',
      'Full confidence scores (H/D/A + Kelly %)',
      'xG, Elo, form, market edge per match',
      'Webhook push on new picks (07:00 & 13:00)',
      '12-month historical',
      'Rate limit: 10 req/s',
      '99.5% uptime SLA',
      'Email support 48h',
    ],
    ctaRo: 'Contactează-ne',
    ctaEn: 'Contact us',
  },
  {
    id: 'enterprise',
    nameRo: 'Enterprise',
    nameEn: 'Enterprise',
    price: 'Custom',
    period: '',
    periodEn: '',
    highlight: false,
    featuresRo: [
      'Volume nelimitat',
      'White-label complet (branding propriu)',
      'Model dedicat per client (fine-tune)',
      'Integrare directă în platforma ta',
      'Dashboard analytics privat',
      'Account manager dedicat',
      'SLA 99.9% + contract',
    ],
    featuresEn: [
      'Unlimited volume',
      'Full white-label (your branding)',
      'Dedicated model per client (fine-tune)',
      'Direct integration into your platform',
      'Private analytics dashboard',
      'Dedicated account manager',
      '99.9% SLA + contract',
    ],
    ctaRo: 'Negociem direct',
    ctaEn: 'Let\'s talk',
  },
]

const ENDPOINTS = [
  { method: 'GET', path: '/api/v1/fixtures', descRo: 'Meciuri disponibile pentru o dată', descEn: 'Available fixtures for a date' },
  { method: 'GET', path: '/api/v1/predictions', descRo: 'Probability outputs complete cu confidence + Kelly', descEn: 'Full probability outputs with confidence + Kelly' },
  { method: 'GET', path: '/api/v1/teams/{team}/stats', descRo: 'Statistici echipă: formă, Elo, xG rolling', descEn: 'Team stats: form, Elo, rolling xG' },
  { method: 'GET', path: '/api/v1/track-record', descRo: 'Track record verificabil per confidence tier', descEn: 'Verifiable track record per confidence tier' },
  { method: 'POST', path: '/api/v1/webhook/subscribe', descRo: 'Abonare push picks (webhook URL propriu)', descEn: 'Subscribe to push picks (your webhook URL)' },
]

export default function DevelopersPage() {
  const { lang } = useLang()
  const isEn = lang === 'en'

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #051F14 0%, #0A1128 100%)', color: '#e5e7eb', fontFamily: 'system-ui, sans-serif' }}>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #1f2937', padding: '20px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <a href="/" style={{ display: 'inline-flex', textDecoration: 'none' }}>
            <img src="/logo-icon.jpg" alt="Oxiano" style={{ height: 48, width: 'auto', objectFit: 'contain' }} />
          </a>
          <span style={{ color: '#22d3ee', fontSize: 10, fontFamily: 'monospace', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            {isEn ? 'Defining the Edge' : 'Definim avantajul'}
          </span>
        </div>
      </nav>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '64px 24px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 72 }}>
          <div style={{ display: 'inline-block', background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.18)', borderRadius: 20, padding: '5px 16px', marginBottom: 20 }}>
            <span style={{ color: '#22d3ee', fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              {isEn ? 'API · B2B' : 'API · B2B'}
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(28px,5vw,48px)', fontWeight: 800, margin: '0 0 20px', lineHeight: 1.15 }}>
            {isEn ? 'Build on the Oxiano Engine' : 'Construiește pe motorul Oxiano'}
          </h1>
          <p style={{ color: '#9ca3af', fontSize: 17, maxWidth: 580, margin: '0 auto', lineHeight: 1.65 }}>
            {isEn
              ? 'Integrate our quantitative football analytics directly into your platform. Same models, same edge — your product.'
              : 'Integrează analiza noastră cantitativă de fotbal direct în platforma ta. Aceleași modele, același avantaj — produsul tău.'}
          </p>
        </div>

        {/* Pricing tiers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginBottom: 80 }}>
          {TIERS.map((tier) => (
            <div key={tier.id} style={{
              background: tier.highlight ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${tier.highlight ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 16,
              padding: '32px 28px',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
            }}>
              {tier.highlight && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#22c55e', color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', padding: '3px 14px', borderRadius: 20, textTransform: 'uppercase' }}>
                  {isEn ? 'Most Popular' : 'Cel mai ales'}
                </div>
              )}
              <div style={{ marginBottom: 8 }}>
                <span style={{ color: '#9ca3af', fontSize: 12, fontFamily: 'monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {isEn ? tier.nameEn : tier.nameRo}
                </span>
              </div>
              <div style={{ marginBottom: 24 }}>
                <span style={{ fontSize: 36, fontWeight: 800, color: tier.highlight ? '#22c55e' : '#f9fafb' }}>{tier.price}</span>
                <span style={{ color: '#6b7280', fontSize: 14, marginLeft: 4 }}>{isEn ? tier.periodEn : tier.period}</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', flex: 1 }}>
                {(isEn ? tier.featuresEn : tier.featuresRo).map((f, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                    <span style={{ color: '#22c55e', fontSize: 14, marginTop: 2, flexShrink: 0 }}>✓</span>
                    <span style={{ color: '#d1d5db', fontSize: 14, lineHeight: 1.5 }}>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href="mailto:florianparvu9@gmail.com?subject=Oxiano API"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '11px 0',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: 'none',
                  background: tier.highlight ? '#22c55e' : 'rgba(255,255,255,0.06)',
                  color: tier.highlight ? '#fff' : '#d1d5db',
                  border: tier.highlight ? 'none' : '1px solid rgba(255,255,255,0.12)',
                  cursor: 'pointer',
                }}
              >
                {isEn ? tier.ctaEn : tier.ctaRo}
              </a>
            </div>
          ))}
        </div>

        {/* API Reference preview */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '40px 32px', marginBottom: 64 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
            {isEn ? 'API Reference (preview)' : 'Referință API (preview)'}
          </h2>
          <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 28, fontFamily: 'monospace' }}>
            Base URL: <span style={{ color: '#22d3ee' }}>https://football-predictor-vlpp.onrender.com</span>
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {ENDPOINTS.map((ep, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 16, padding: '12px 16px', background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent', borderRadius: 6, alignItems: 'center' }}>
                <span style={{
                  fontSize: 11, fontFamily: 'monospace', fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                  background: ep.method === 'GET' ? 'rgba(34,197,94,0.12)' : 'rgba(59,130,246,0.12)',
                  color: ep.method === 'GET' ? '#4ade80' : '#60a5fa',
                  textAlign: 'center',
                }}>
                  {ep.method}
                </span>
                <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#e5e7eb' }}>{ep.path}</span>
                <span style={{ fontSize: 13, color: '#9ca3af' }}>{isEn ? ep.descEn : ep.descRo}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sample response */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '40px 32px', marginBottom: 64 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
            {isEn ? 'Sample Response' : 'Exemplu răspuns'}
          </h2>
          <pre style={{
            background: '#0d1117',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10,
            padding: '24px 20px',
            overflowX: 'auto',
            fontSize: 12,
            lineHeight: 1.7,
            color: '#c9d1d9',
            fontFamily: 'monospace',
            margin: 0,
          }}>
{`GET /api/v1/predictions?date=2026-05-06&league=PL

{
  "predictions": [
    {
      "home": "Arsenal",
      "away": "Chelsea",
      "league": "Premier League",
      "kickoff": "17:30",
      "home_win": 0.481,
      "draw": 0.267,
      "away_win": 0.252,
      "prediction": "H",
      "confidence": 0.481,
      "confidence_level": "medium",
      "kelly_pct": 4.2,
      "xg_home": 1.84,
      "xg_away": 1.21,
      "elo_diff": 87,
      "market_edge": 0.062,
      "market_signal": "VALUE_HOME"
    }
  ],
  "generated_at": "2026-05-06T06:58:12Z",
  "model_version": "xgb-v2"
}`}
          </pre>
        </div>

        {/* Use cases */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 32 }}>
            {isEn ? 'Built for builders' : 'Construit pentru developeri'}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { icon: '📱', ro: 'Aplicații mobile de analiză sportivă', en: 'Sports analytics mobile apps' },
              { icon: '🌐', ro: 'Platforme de conținut sportiv', en: 'Sports content platforms' },
              { icon: '📈', ro: 'Tool-uri de gestiune bankroll', en: 'Bankroll management tools' },
              { icon: '🤖', ro: 'Boți Telegram / Discord automatizați', en: 'Automated Telegram / Discord bots' },
              { icon: '🏢', ro: 'Soluții B2B white-label', en: 'B2B white-label solutions' },
              { icon: '🔬', ro: 'Cercetare academică în analitica sportivă', en: 'Academic sports analytics research' },
            ].map((uc, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '20px 16px' }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{uc.icon}</div>
                <div style={{ color: '#9ca3af', fontSize: 13, lineHeight: 1.5 }}>{isEn ? uc.en : uc.ro}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA final */}
        <div style={{ textAlign: 'center', background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 20, padding: '48px 32px' }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 12 }}>
            {isEn ? 'Interested?' : 'Ești interesat?'}
          </h2>
          <p style={{ color: '#9ca3af', fontSize: 15, maxWidth: 480, margin: '0 auto 28px', lineHeight: 1.65 }}>
            {isEn
              ? 'Write us about your use case and volume. We\'ll respond within 24 hours with a technical proposal.'
              : 'Scrie-ne despre cazul tău de utilizare și volumul necesar. Răspundem în 24 de ore cu o propunere tehnică.'}
          </p>
          <a
            href="mailto:florianparvu9@gmail.com?subject=Oxiano API — parteneriat"
            style={{
              display: 'inline-block',
              background: '#22c55e',
              color: '#fff',
              padding: '13px 32px',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 700,
              textDecoration: 'none',
              letterSpacing: '0.02em',
            }}
          >
            {isEn ? 'Contact us' : 'Contactează-ne'}
          </a>
        </div>

      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #1f2937', padding: '24px', textAlign: 'center', marginTop: 64 }}>
        <p style={{ color: '#4b5563', fontSize: 12, margin: 0 }}>
          {isEn
            ? '© 2026 Oxiano · Statistical analysis for educational purposes · Not betting advice'
            : '© 2026 Oxiano · Analiză statistică în scop educațional · Nu constituie sfat de pariere'}
        </p>
      </footer>

    </div>
  )
}
