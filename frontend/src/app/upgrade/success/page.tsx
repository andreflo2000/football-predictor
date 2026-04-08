'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function UpgradeSuccessPage() {
  const [plan, setPlan] = useState<string>('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setPlan(params.get('plan') || 'analyst')

    // Actualizeaza token-ul local — userul trebuie sa se relogheze
    // pentru a vedea noul tier in JWT (sau fetch /api/auth/me)
    const token = localStorage.getItem('flopi_token')
    if (!token) return

    const API = process.env.NEXT_PUBLIC_API_URL || 'https://football-predictor-api.onrender.com'
    fetch(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((user) => {
        const raw = localStorage.getItem('flopi_user')
        if (raw) {
          const parsed = JSON.parse(raw)
          localStorage.setItem('flopi_user', JSON.stringify({ ...parsed, tier: user.tier }))
        }
      })
      .catch(() => {})
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      color: '#f1f5f9',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <div style={{ fontSize: 72, marginBottom: 24 }}>🎉</div>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>
          Abonament activat!
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 16, marginBottom: 8 }}>
          Planul <strong style={{ color: '#f59e0b', textTransform: 'capitalize' }}>{plan}</strong> este acum activ.
        </p>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 40, lineHeight: 1.6 }}>
          Daca nu vezi imediat accesul extins, delogheaza-te si relogheaza-te
          pentru a actualiza sesiunea.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Link href="/daily" style={{
            display: 'block',
            padding: '14px 32px',
            background: 'linear-gradient(90deg, #3b82f6, #1d4ed8)',
            color: '#fff',
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 15,
            textDecoration: 'none',
          }}>
            Selectiile de azi
          </Link>
          <Link href="/" style={{
            display: 'block',
            padding: '14px 32px',
            background: 'rgba(255,255,255,0.06)',
            color: '#94a3b8',
            borderRadius: 12,
            fontWeight: 600,
            fontSize: 15,
            textDecoration: 'none',
          }}>
            Pagina principala
          </Link>
        </div>
      </div>
    </div>
  )
}
