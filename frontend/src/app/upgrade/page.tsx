'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getUser, AuthUser, createCheckoutSession, isPaid } from '@/lib/auth'

const PLANS = [
  {
    id: 'analyst' as const,
    name: 'Analyst',
    price: 29,
    badge: null,
    color: 'from-blue-600 to-blue-800',
    ring: 'ring-blue-500',
    features: [
      'Toate predictiile HIGH confidence',
      'Acumulator zilnic 3-fold',
      'Statistici avansate xG + Elo',
      'Notificari Telegram',
      'Istoric complet track record',
    ],
    notIncluded: [
      'Picks VIP exclusive',
      'Suport prioritar',
    ],
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: 79,
    badge: 'Recomandat',
    color: 'from-yellow-500 to-orange-600',
    ring: 'ring-yellow-400',
    features: [
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
            Upgrade cont
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, marginBottom: 16, lineHeight: 1.15 }}>
            Analitica profesionala.<br />
            <span style={{ color: '#60a5fa' }}>Fara zgomot.</span>
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 16, maxWidth: 520, margin: '0 auto' }}>
            Modelul nostru XGBoost inregistreaza 75% acuratete la predictiile HIGH confidence.
            Alege planul potrivit pentru stilul tau de analiza.
          </p>
        </div>

        {alreadyPaid && (
          <div style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid #22c55e', borderRadius: 12, padding: '16px 24px', marginBottom: 32, textAlign: 'center', color: '#4ade80' }}>
            Ai deja un abonament activ ({user?.tier}). Multumim pentru incredere!
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', borderRadius: 12, padding: '16px 24px', marginBottom: 32, textAlign: 'center', color: '#f87171' }}>
            {error}
          </div>
        )}

        {/* Pricing cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 48 }}>
          {PLANS.map((plan) => (
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
                  <span style={{ fontSize: 16, color: '#64748b' }}>RON/lună</span>
                </div>
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
                {loading === plan.id ? 'Se redirectioneaza...' : alreadyPaid ? 'Abonament activ' : `Alege ${plan.name}`}
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
            Gratuit (cont existent)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {[
              'Predictii MEDIUM + LOW confidence',
              'Acumulatoare publice',
              'Track record public',
              'Share pe WhatsApp/Telegram',
            ].map((f) => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 14 }}>
                <span style={{ color: '#4ade80' }}>✓</span> {f}
              </div>
            ))}
          </div>
        </div>

        {/* Trust badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 32, marginBottom: 48, color: '#64748b', fontSize: 13 }}>
          {[
            { icon: '🔒', text: 'Plata securizata Stripe' },
            { icon: '↩️', text: 'Anulezi oricand' },
            { icon: '📊', text: '75% acuratete verificata' },
            { icon: '🇷🇴', text: 'Pretul in RON' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div style={{ textAlign: 'center', color: '#475569', fontSize: 12, lineHeight: 1.6 }}>
          Prin abonare esti de acord cu{' '}
          <Link href="/terms" style={{ color: '#60a5fa', textDecoration: 'none' }}>Termenii si Conditiile</Link>
          {' '}si{' '}
          <Link href="/privacy" style={{ color: '#60a5fa', textDecoration: 'none' }}>Politica de Confidentialitate</Link>.
          Oxiano ofera analize statistice. Nu constituie sfat de pariere.
          Jocul de noroc poate crea dependenta. 18+
        </div>
      </div>
    </div>
  )
}
