'use client'
import { useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://football-predictor-api-n9sl.onrender.com'

interface UserRow {
  id: number
  email: string
  tier: string
  tier_expires: string | null
  created_at: string
}

export default function AdminPage() {
  const [secret, setSecret]       = useState('')
  const [authed, setAuthed]       = useState(false)
  const [search, setSearch]       = useState('')
  const [users, setUsers]         = useState<UserRow[]>([])
  const [loading, setLoading]     = useState(false)
  const [msg, setMsg]             = useState('')

  const [selEmail, setSelEmail]   = useState('')
  const [selTier, setSelTier]     = useState('pro')
  const [selDays, setSelDays]     = useState('30')

  async function doSearch() {
    setLoading(true); setMsg('')
    try {
      const res = await fetch(`${API}/api/admin/users?search=${encodeURIComponent(search)}`, {
        headers: { 'X-Admin-Key': secret }
      })
      if (res.status === 403) { setMsg('Parolă greșită'); setLoading(false); return }
      const data = await res.json()
      setUsers(data)
      setAuthed(true)
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
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': secret },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setMsg(data.detail || 'Eroare'); setLoading(false); return }
      setMsg(`✅ ${data.email} → ${data.tier}${data.tier_expires ? ` (expiră ${data.tier_expires.split('T')[0]})` : ' (nelimitat)'}`)
      doSearch()
    } catch { setMsg('Eroare conexiune') }
    setLoading(false)
  }

  const tierColor: Record<string, string> = {
    free: '#6b7280', analyst: '#3b82f6', pro: '#f59e0b', vip: '#a855f7'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050f0a', padding: '40px 16px', fontFamily: 'monospace' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#4ade80', marginBottom: 24 }}>
          ⚙️ Admin Panel — Oxiano
        </div>

        {/* Auth + Search */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2 }}>Admin Secret</div>
          <input
            type="password"
            placeholder="Parolă admin"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, marginBottom: 12, boxSizing: 'border-box' }}
          />
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2 }}>Caută email</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="ex: marculescu"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              style={{ flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14 }}
            />
            <button onClick={doSearch} disabled={loading}
              style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#4ade80', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
              {loading ? '...' : 'Caută'}
            </button>
          </div>
        </div>

        {/* User list */}
        {users.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 2 }}>
              {users.length} useri găsiți — click pentru a selecta
            </div>
            {users.map(u => (
              <div key={u.id} onClick={() => setSelEmail(u.email)}
                style={{
                  padding: '12px 14px', borderRadius: 8, marginBottom: 6, cursor: 'pointer',
                  background: selEmail === u.email ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${selEmail === u.email ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.05)'}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                <div>
                  <div style={{ color: '#e5e7eb', fontSize: 14 }}>{u.email}</div>
                  <div style={{ color: '#4b5563', fontSize: 11, marginTop: 2 }}>
                    creat: {u.created_at.split('T')[0]}
                    {u.tier_expires && ` · expiră: ${u.tier_expires.split('T')[0]}`}
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: tierColor[u.tier] || '#fff', background: `${tierColor[u.tier]}20`, padding: '3px 10px', borderRadius: 20 }}>
                  {u.tier.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Set tier form */}
        {authed && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 2 }}>Setează tier</div>

            {selEmail && (
              <div style={{ fontSize: 13, color: '#4ade80', marginBottom: 12 }}>
                👤 {selEmail}
              </div>
            )}

            {!selEmail && (
              <input
                placeholder="Email user (dacă nu e în listă)"
                value={selEmail}
                onChange={e => setSelEmail(e.target.value)}
                style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, marginBottom: 12, boxSizing: 'border-box' }}
              />
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              {['free', 'analyst', 'pro', 'vip'].map(t => (
                <button key={t} onClick={() => setSelTier(t)}
                  style={{
                    padding: '10px', borderRadius: 8, border: `1px solid ${selTier === t ? tierColor[t] : 'rgba(255,255,255,0.08)'}`,
                    background: selTier === t ? `${tierColor[t]}20` : 'transparent',
                    color: selTier === t ? tierColor[t] : '#6b7280',
                    fontWeight: 700, cursor: 'pointer', fontSize: 13, textTransform: 'uppercase',
                  }}>
                  {t}
                </button>
              ))}
            </div>

            {selTier !== 'free' && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <input
                  type="number" min="1" placeholder="Zile"
                  value={selDays}
                  onChange={e => setSelDays(e.target.value)}
                  style={{ width: 100, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14 }}
                />
                <span style={{ color: '#6b7280', fontSize: 13 }}>zile (gol = nelimitat)</span>
              </div>
            )}

            <button onClick={doSetTier} disabled={loading || !selEmail}
              style={{ width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: loading ? '#374151' : '#f59e0b', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
              {loading ? 'Se salvează...' : `Activează ${selTier.toUpperCase()}${selDays && selTier !== 'free' ? ` · ${selDays} zile` : ''}`}
            </button>

            {msg && (
              <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: msg.startsWith('✅') ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)', color: msg.startsWith('✅') ? '#4ade80' : '#f87171', fontSize: 13 }}>
                {msg}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
