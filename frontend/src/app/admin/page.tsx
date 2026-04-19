'use client'
import { useState, useEffect } from 'react'
import { login, getToken, getUser, isAdmin } from '@/lib/auth'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://football-predictor-api-n9sl.onrender.com'

interface UserRow {
  id: number
  email: string
  tier: string
  tier_expires: string | null
  created_at: string
}

const TIER_COLOR: Record<string, string> = {
  free: '#6b7280', analyst: '#3b82f6', pro: '#f59e0b', vip: '#a855f7'
}

export default function AdminPage() {
  const [authed, setAuthed]       = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPass, setLoginPass]   = useState('')
  const [loginErr, setLoginErr]     = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [search, setSearch]       = useState('')
  const [users, setUsers]         = useState<UserRow[]>([])
  const [loading, setLoading]     = useState(false)
  const [msg, setMsg]             = useState('')

  const [selEmail, setSelEmail]   = useState('')
  const [selTier, setSelTier]     = useState('pro')
  const [selDays, setSelDays]     = useState('30')

  useEffect(() => {
    if (getToken() && isAdmin()) {
      setAuthed(true)
      doSearch('')
    }
  }, [])

  async function doLogin() {
    setLoginLoading(true); setLoginErr('')
    try {
      await login(loginEmail, loginPass)
      if (!isAdmin()) {
        setLoginErr('Contul tău nu are acces admin.')
        setLoginLoading(false)
        return
      }
      setAuthed(true)
      doSearch('')
    } catch (e: any) {
      setLoginErr(e.message || 'Eroare login')
    }
    setLoginLoading(false)
  }

  async function doSearch(q = search) {
    setLoading(true); setMsg('')
    try {
      const token = getToken()
      const res = await fetch(`${API}/api/admin/users?search=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.status === 403) { setMsg('Acces refuzat'); setLoading(false); return }
      setUsers(await res.json())
    } catch { setMsg('Eroare conexiune') }
    setLoading(false)
  }

  async function doSetTier() {
    if (!selEmail) { setMsg('Selectează un user'); return }
    setLoading(true); setMsg('')
    try {
      const body: any = { email: selEmail, tier: selTier }
      if (selDays && selTier !== 'free') body.days = parseInt(selDays)
      const res = await fetch(`${API}/api/admin/set-tier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setMsg(data.detail || 'Eroare'); setLoading(false); return }
      setMsg(`✅ ${data.email} → ${data.tier}${data.tier_expires ? ` · expiră ${data.tier_expires.split('T')[0]}` : ' · nelimitat'}`)
      setSelEmail('')
      doSearch(search)
    } catch { setMsg('Eroare conexiune') }
    setLoading(false)
  }

  const s: Record<string, any> = {
    page:  { minHeight: '100vh', background: '#050f0a', padding: '40px 16px', fontFamily: 'monospace' },
    wrap:  { maxWidth: 680, margin: '0 auto' },
    title: { fontSize: 22, fontWeight: 700, color: '#4ade80', marginBottom: 28 },
    card:  { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20, marginBottom: 16 },
    label: { fontSize: 11, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: 2, display: 'block' },
    input: { width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, boxSizing: 'border-box' as const, marginBottom: 12 },
    btn:   { padding: '10px 20px', borderRadius: 8, border: 'none', background: '#4ade80', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: 14 },
  }

  if (!authed) {
    return (
      <div style={s.page}>
        <div style={s.wrap}>
          <div style={s.title}>⚙️ Admin — Oxiano</div>
          <div style={s.card}>
            <span style={s.label}>Email</span>
            <input style={s.input} type="email" placeholder="florianparvu@yahoo.com"
              value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doLogin()} />
            <span style={s.label}>Parolă</span>
            <input style={s.input} type="password" placeholder="••••••••"
              value={loginPass} onChange={e => setLoginPass(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doLogin()} />
            {loginErr && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 10 }}>{loginErr}</div>}
            <button style={s.btn} onClick={doLogin} disabled={loginLoading}>
              {loginLoading ? 'Se conectează...' : 'Intră în Admin'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <div style={s.title}>⚙️ Admin Panel — {getUser()?.email}</div>

        {/* Search */}
        <div style={s.card}>
          <span style={s.label}>Caută utilizator</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="Email sau parte din email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch(search)}
              style={{ ...s.input, marginBottom: 0, flex: 1 }}
            />
            <button style={s.btn} onClick={() => doSearch(search)} disabled={loading}>
              {loading ? '...' : 'Caută'}
            </button>
          </div>
        </div>

        {/* User list */}
        {users.length > 0 && (
          <div style={s.card}>
            <span style={s.label}>{users.length} utilizatori — click pentru a selecta</span>
            {users.map(u => (
              <div key={u.id} onClick={() => { setSelEmail(u.email); setMsg('') }}
                style={{
                  padding: '12px 14px', borderRadius: 8, marginBottom: 6, cursor: 'pointer',
                  background: selEmail === u.email ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${selEmail === u.email ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.05)'}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                <div>
                  <div style={{ color: '#e5e7eb', fontSize: 14 }}>{u.email}</div>
                  <div style={{ color: '#4b5563', fontSize: 11, marginTop: 2 }}>
                    înregistrat: {u.created_at.split('T')[0]}
                    {u.tier_expires && ` · expiră: ${u.tier_expires.split('T')[0]}`}
                  </div>
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  color: TIER_COLOR[u.tier] || '#fff',
                  background: `${TIER_COLOR[u.tier] || '#fff'}22`,
                  padding: '3px 10px', borderRadius: 20
                }}>
                  {u.tier.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Set Tier */}
        <div style={s.card}>
          <span style={s.label}>Setează tier</span>

          {selEmail ? (
            <div style={{ color: '#4ade80', fontSize: 13, marginBottom: 12 }}>👤 {selEmail}
              <span onClick={() => setSelEmail('')} style={{ marginLeft: 8, color: '#4b5563', cursor: 'pointer', fontSize: 11 }}>✕ schimbă</span>
            </div>
          ) : (
            <input style={s.input} placeholder="Email utilizator"
              value={selEmail} onChange={e => setSelEmail(e.target.value)} />
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            {['free', 'analyst', 'pro', 'vip'].map(t => (
              <button key={t} onClick={() => setSelTier(t)} style={{
                padding: '10px', borderRadius: 8,
                border: `1px solid ${selTier === t ? TIER_COLOR[t] : 'rgba(255,255,255,0.08)'}`,
                background: selTier === t ? `${TIER_COLOR[t]}22` : 'transparent',
                color: selTier === t ? TIER_COLOR[t] : '#6b7280',
                fontWeight: 700, cursor: 'pointer', fontSize: 13, textTransform: 'uppercase',
              }}>
                {t}
              </button>
            ))}
          </div>

          {selTier !== 'free' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <input type="number" min="1" placeholder="Zile"
                value={selDays} onChange={e => setSelDays(e.target.value)}
                style={{ width: 100, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14 }}
              />
              <span style={{ color: '#6b7280', fontSize: 13 }}>zile · gol = nelimitat</span>
            </div>
          )}

          <button onClick={doSetTier} disabled={loading || !selEmail} style={{
            width: '100%', padding: '12px', borderRadius: 8, border: 'none',
            background: !selEmail ? '#1f2937' : '#f59e0b',
            color: !selEmail ? '#4b5563' : '#000',
            fontWeight: 700, cursor: selEmail ? 'pointer' : 'not-allowed', fontSize: 14,
          }}>
            {loading ? 'Se salvează...' : `Activează ${selTier.toUpperCase()}${selDays && selTier !== 'free' ? ` · ${selDays} zile` : ''}`}
          </button>

          {msg && (
            <div style={{
              marginTop: 12, padding: '10px 14px', borderRadius: 8,
              background: msg.startsWith('✅') ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
              color: msg.startsWith('✅') ? '#4ade80' : '#f87171', fontSize: 13,
            }}>
              {msg}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
