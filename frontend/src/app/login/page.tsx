'use client'
import { useState } from 'react'
import { login, register } from '@/lib/auth'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode]       = useState<'login' | 'register'>('login')
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

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
          <div style={{ color: '#f1f5f9', fontSize: '20px', fontWeight: 700 }}>Flopi San</div>
          <div style={{ color: '#94a3b8', fontSize: '13px' }}>Forecast Academy</div>
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
              {m === 'login' ? 'Autentificare' : 'Cont nou'}
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
              Parolă {mode === 'register' && <span style={{ color: '#64748b' }}>(minim 6 caractere)</span>}
            </label>
            <input
              type="password" value={password} onChange={e => setPass(e.target.value)}
              required minLength={6} placeholder="••••••••"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '8px',
                background: '#0f172a', border: '1px solid #334155',
                color: '#f1f5f9', fontSize: '15px', boxSizing: 'border-box',
                outline: 'none',
              }}
            />
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
            {loading ? 'Se procesează...' : mode === 'login' ? 'Intră în cont' : 'Creează cont'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <a href="/daily" style={{ color: '#64748b', fontSize: '13px', textDecoration: 'none' }}>
            Continua fara cont →
          </a>
        </div>
      </div>
    </div>
  )
}
