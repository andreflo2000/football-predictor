'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getUser, AuthUser, createCheckoutSession, isPaid } from '@/lib/auth'
import { useLang } from '@/lib/LangContext'

const PLANS = (lang: 'ro' | 'en') => [
  {
    id: 'analyst' as const,
    name: 'Analyst',
    price: 39,
    badge: null,
    features: lang === 'en' ? [
      'All HIGH confidence predictions',
      'Daily 3-fold accumulator',
      'Advanced xG + Elo statistics',
      'Telegram notifications',
      'Full track record history',
    ] : [
      'Toate predictiile HIGH confidence',
      'Acumulator zilnic 3-fold',
      'Statistici avansate xG + Elo',
      'Notificari Telegram',
      'Istoric complet track record',
    ],
    notIncluded: lang === 'en' ? ['Exclusive VIP picks', 'Priority support'] : ['Picks VIP exclusive', 'Suport prioritar'],
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: 99,
    badge: lang === 'en' ? 'Recommended' : 'Recomandat',
    features: lang === 'en' ? [
      'Everything in Analyst',
      'Exclusive VIP picks (top 3 daily)',
      '5-fold high-value accumulator',
      'Comparative market analysis',
      'Priority support 24/7',
      'Beta access to new features',
    ] : [
      'Tot ce include Analyst',
      'Picks VIP exclusive (top 3 zilnic)',
      'Acumulator 5-fold high-value',
      'Analiza comparativa piete',
      'Suport prioritar 24/7',
      'Acces beta functii noi',
    ],
    notIncluded: [],
  },
]

export default function UpgradePage() {
  const { lang } = useLang()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setUser(getUser())
  }, [])

  async function handleUpgrade(plan: 'analyst' | 'pro') {
    if (!user) {
      window.location.href = '/login?redirect=/upgrade'
      return
    }
    setLoading(plan)
    setError(null)
    try {
      const url = await createCheckoutSession(plan)
      window.location.href = url
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Eroare necunoscuta')
      setLoading(null)
    }
  }

  const alreadyPaid = isPaid()

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#f1f5f9' }}>
      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Link href="/" style={{ fontWeight: 700, fontSize: 18, color: '#60a5fa', textDecoration: 'none' }}>
          Oxiano
        </Link>
        <Link href="/daily" style={{ color: '#94a3b8', fontSize: 14, textDecoration: 'none' }}>
          Selectiile zilei
        </Link>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b', letterSpacing: 2, marginBottom: 12, textTransform: 'uppercase' }}>
            {lang === 'en' ? 'Upgrade account' : 'Upgrade cont'}
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, marginBottom: 16, lineHeight: 1.15 }}>
            {lang === 'en' ? <>Professional analytics.<br /><span style={{ color: '#60a5fa' }}>No noise.</span></> : <>Analitica profesionala.<br /><span style={{ color: '#60a5fa' }}>Fara zgomot.</span></>}
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 16, maxWidth: 520, margin: '0 auto' }}>
            {lang === 'en'
              ? 'Our XGBoost model achieves 75% accuracy on HIGH confidence predictions. Choose the plan that fits your analysis style.'
              : 'Modelul nostru XGBoost inregistreaza 75% acuratete la predictiile HIGH confidence. Alege planul potrivit pentru stilul tau de analiza.'}
          </p>
        </div>

        {alreadyPaid && (
          <div style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid #22c55e', borderRadius: 12, padding: '16px 24px', marginBottom: 32, textAlign: 'center', color: '#4ade80' }}>
            {lang === 'en' ? `You already have an active subscription (${user?.tier}). Thank you for your trust!` : `Ai deja un abonament activ (${user?.tier}). Multumim pentru incredere!`}
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', borderRadius: 12, padding: '16px 24px', marginBottom: 32, textAlign: 'center', color: '#f87171' }}>
            {error}
          </div>
        )}

        {/* Pricing cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 48 }}>
          {PLANS(lang).map((plan) => (
            <div
              key={plan.id}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: plan.badge ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: 20,
                padding: '32px 28px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {plan.badge && (
                <div style={{
                  position: 'absolute',
                  top: -14,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  padding: '4px 16px',
                  borderRadius: 99,
                }}>
                  {plan.badge}
                </div>
              )}

              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {plan.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 42, fontWeight: 800, color: '#f1f5f9' }}>{plan.price}</span>
                  <span style={{ fontSize: 16, color: '#64748b' }}>RON/{lang === 'en' ? 'month' : 'lună'}</span>
                </div>
                {lang === 'en' && (
                  <div style={{ fontSize: 13, color: '#475569', marginTop: 4, fontFamily: 'monospace' }}>
                    ≈ {plan.price === 39 ? '8' : '20'}€/month
                  </div>
                )}
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', flexGrow: 1 }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12, color: '#cbd5e1', fontSize: 14 }}>
                    <span style={{ color: '#4ade80', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                    {f}
                  </li>
                ))}
                {plan.notIncluded.map((f) => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12, color: '#475569', fontSize: 14 }}>
                    <span style={{ flexShrink: 0, marginTop: 1 }}>✗</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={!!loading || alreadyPaid}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  borderRadius: 12,
                  border: 'none',
                  cursor: loading || alreadyPaid ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: 15,
                  transition: 'opacity 0.2s',
                  opacity: loading && loading !== plan.id ? 0.5 : 1,
                  background: plan.badge
                    ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                    : 'linear-gradient(90deg, #3b82f6, #1d4ed8)',
                  color: '#fff',
                }}
              >
                {loading === plan.id ? (lang === 'en' ? 'Redirecting...' : 'Se redirectioneaza...') : alreadyPaid ? (lang === 'en' ? 'Active subscription' : 'Abonament activ') : (lang === 'en' ? `Choose ${plan.name}` : `Alege ${plan.name}`)}
              </button>
            </div>
          ))}
        </div>

        {/* Free tier comparison */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 48,
        }}>
          <div style={{ fontWeight: 600, color: '#64748b', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1, fontSize: 12 }}>
            {lang === 'en' ? 'Free (existing account)' : 'Gratuit (cont existent)'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {(lang === 'en' ? [
              'MEDIUM + LOW confidence predictions',
              'Public accumulators',
              'Public track record',
              'Share on WhatsApp/Telegram',
            ] : [
              'Predictii MEDIUM + LOW confidence',
              'Acumulatoare publice',
              'Track record public',
              'Share pe WhatsApp/Telegram',
            ]).map((f) => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 14 }}>
                <span style={{ color: '#4ade80' }}>✓</span> {f}
              </div>
            ))}
          </div>
        </div>

        {/* Trust badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 32, marginBottom: 48, color: '#64748b', fontSize: 13 }}>
          {(lang === 'en' ? [
            { icon: '🔒', text: 'Secure Gumroad payment' },
            { icon: '↩️', text: 'Cancel anytime' },
            { icon: '📊', text: '75% verified accuracy' },
            { icon: '🇷🇴', text: 'Price in RON' },
          ] : [
            { icon: '🔒', text: 'Plata securizata Gumroad' },
            { icon: '↩️', text: 'Anulezi oricand' },
            { icon: '📊', text: '75% acuratete verificata' },
            { icon: '🇷🇴', text: 'Pretul in RON' },
          ]).map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div style={{ textAlign: 'center', color: '#475569', fontSize: 12, lineHeight: 1.6 }}>
          {lang === 'en' ? <>By subscribing you agree to our{' '}
          <Link href="/terms" style={{ color: '#60a5fa', textDecoration: 'none' }}>Terms & Conditions</Link>
          {' '}and{' '}
          <Link href="/privacy" style={{ color: '#60a5fa', textDecoration: 'none' }}>Privacy Policy</Link>.
          Oxiano provides statistical analysis. Not betting advice. Gambling can be addictive. 18+</> : <>Prin abonare esti de acord cu{' '}
          <Link href="/terms" style={{ color: '#60a5fa', textDecoration: 'none' }}>Termenii si Conditiile</Link>
          {' '}si{' '}
          <Link href="/privacy" style={{ color: '#60a5fa', textDecoration: 'none' }}>Politica de Confidentialitate</Link>.
          Oxiano ofera analize statistice. Nu constituie sfat de pariere. Jocul de noroc poate crea dependenta. 18+</>}
        </div>
      </div>
    </div>
  )
}
