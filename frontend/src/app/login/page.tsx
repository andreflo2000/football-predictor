'use client'
import { useState } from 'react'
import { login, register, getToken, logout } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/LangContext'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://football-predictor-api-n9sl.onrender.com'

export default function LoginPage() {
  const router = useRouter()
  const { lang } = useLang()
  const [mode, setMode]         = useState<'login' | 'register'>('login')
  const [email, setEmail]       = useState('')
  const [password, setPass]     = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  // Schimbare parola
  const [cpCurrent, setCpCurrent] = useState('')
  const [cpNew, setCpNew]         = useState('')
  const [cpMsg, setCpMsg]         = useState('')
  const [cpErr, setCpErr]         = useState('')
  const [cpLoading, setCpLoading] = useState(false)
  const [showCp, setShowCp]       = useState(false)

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setCpMsg(''); setCpErr('')
    setCpLoading(true)
    try {
      const r = await fetch(`${API}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ current_password: cpCurrent, new_password: cpNew }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.detail || 'Eroare')
      setCpMsg(lang === 'en' ? 'Password changed successfully!' : 'Parola a fost schimbată cu succes!')
      setCpCurrent(''); setCpNew('')
    } catch (err: any) {
      setCpErr(err.message)
    } finally {
      setCpLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, password)
      }
      router.push('/daily')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0f172a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        background: '#1e293b', borderRadius: '16px', padding: '32px',
        width: '100%', maxWidth: '400px', border: '1px solid #334155',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '32px', marginBottom: '4px' }}>⚽</div>
          <div style={{ color: '#f1f5f9', fontSize: '20px', fontWeight: 700 }}>Oxiano</div>
          <div style={{ color: '#94a3b8', fontSize: '13px' }}>Quantitative Analysis</div>
        </div>

        {/* Toggle */}
        <div style={{
          display: 'flex', background: '#0f172a', borderRadius: '8px',
          padding: '4px', marginBottom: '24px',
        }}>
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '8px', borderRadius: '6px', border: 'none',
              cursor: 'pointer', fontSize: '14px', fontWeight: 600,
              background: mode === m ? '#3b82f6' : 'transparent',
              color: mode === m ? '#fff' : '#94a3b8',
              transition: 'all 0.2s',
            }}>
              {m === 'login' ? (lang === 'en' ? 'Sign In' : 'Autentificare') : (lang === 'en' ? 'New account' : 'Cont nou')}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: '#94a3b8', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
              Email
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required placeholder="email@exemplu.com"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '8px',
                background: '#0f172a', border: '1px solid #334155',
                color: '#f1f5f9', fontSize: '15px', boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ color: '#94a3b8', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
              {lang === 'en' ? 'Password' : 'Parolă'} {mode === 'register' && <span style={{ color: '#64748b' }}>({lang === 'en' ? 'min 6 characters' : 'minim 6 caractere'})</span>}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'} value={password} onChange={e => setPass(e.target.value)}
                required minLength={6} placeholder="••••••••"
                style={{
                  width: '100%', padding: '10px 40px 10px 12px', borderRadius: '8px',
                  background: '#0f172a', border: '1px solid #334155',
                  color: '#f1f5f9', fontSize: '15px', boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#64748b', fontSize: '16px', padding: '0',
                }}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              background: '#450a0a', border: '1px solid #991b1b',
              color: '#fca5a5', borderRadius: '8px', padding: '10px 12px',
              fontSize: '13px', marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '12px', borderRadius: '8px',
            background: loading ? '#1d4ed8' : '#3b82f6',
            color: '#fff', fontSize: '15px', fontWeight: 700,
            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}>
            {loading ? (lang === 'en' ? 'Processing...' : 'Se procesează...') : mode === 'login' ? (lang === 'en' ? 'Sign In' : 'Intră în cont') : (lang === 'en' ? 'Create account' : 'Creează cont')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <a href="/daily" style={{ color: '#64748b', fontSize: '13px', textDecoration: 'none' }}>
            {lang === 'en' ? 'Continue without account →' : 'Continuă fără cont →'}
          </a>
          {getToken() && (
            <>
              <button
                onClick={() => setShowCp(v => !v)}
                style={{ color: '#3b82f6', fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                🔑 {lang === 'en' ? 'Change password' : 'Schimbă parola'}
              </button>

              {showCp && (
                <form onSubmit={handleChangePassword} style={{ textAlign: 'left', marginTop: 8, background: '#0f172a', borderRadius: 10, padding: '16px', border: '1px solid #1e3a5f' }}>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 4 }}>{lang === 'en' ? 'Current password' : 'Parola curentă'}</label>
                    <input type="password" value={cpCurrent} onChange={e => setCpCurrent(e.target.value)} required
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 4 }}>{lang === 'en' ? 'New password (min 6 characters)' : 'Parola nouă (minim 6 caractere)'}</label>
                    <input type="password" value={cpNew} onChange={e => setCpNew(e.target.value)} required minLength={6}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                  {cpErr && <div style={{ color: '#fca5a5', fontSize: 12, marginBottom: 8 }}>{cpErr}</div>}
                  {cpMsg && <div style={{ color: '#4ade80', fontSize: 12, marginBottom: 8 }}>{cpMsg}</div>}
                  <button type="submit" disabled={cpLoading} style={{ width: '100%', padding: '8px', borderRadius: 6, background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
                    {cpLoading ? (lang === 'en' ? 'Saving...' : 'Se salvează...') : (lang === 'en' ? 'Save new password' : 'Salvează parola nouă')}
                  </button>
                </form>
              )}

              <button
                onClick={async () => {
                  if (!confirm(lang === 'en' ? 'Are you sure? Your account and all data will be permanently deleted.' : 'Ești sigur? Contul și toate datele tale vor fi șterse permanent.')) return
                  try {
                    await fetch(`${API}/api/auth/account`, {
                      method: 'DELETE',
                      headers: { Authorization: `Bearer ${getToken()}` },
                    })
                    logout()
                  } catch {
                    alert('Eroare la ștergere. Contactează contact@oxiano.com')
                  }
                }}
                style={{ color: '#ef4444', fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'monospace' }}
              >
                {lang === 'en' ? 'Delete my account and all data' : 'Șterge contul și toate datele mele'}
              </button>
            </>
          )}
        </div>

        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #1e293b', textAlign: 'center' }}>
          <a href="/terms" style={{ color: '#475569', fontSize: '10px', fontFamily: 'monospace', marginRight: '12px' }}>{lang === 'en' ? 'Terms' : 'Termeni'}</a>
          <a href="/privacy" style={{ color: '#475569', fontSize: '10px', fontFamily: 'monospace' }}>{lang === 'en' ? 'Privacy' : 'Confidențialitate'}</a>
        </div>
      </div>
    </div>
  )
}
