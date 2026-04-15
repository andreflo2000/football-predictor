'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        router.push('/')
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        setSuccess('Cont creat! Verifică emailul pentru confirmare.')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen pitch-grid scanlines flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-[#00ff6a] flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
            <span className="text-black font-bold text-2xl">⚽</span>
          </div>
          <h1 className="font-display font-800 text-3xl tracking-widest text-white uppercase glow-text">
            Oxiano
          </h1>
          <p className="text-xs font-mono text-[#00ff6a]/50 tracking-[0.2em] uppercase mt-1">
            AI Football Predictions
          </p>
        </div>

        {/* Card */}
        <div className="ticket-card p-8">
          {/* Tabs */}
          <div className="flex gap-1 bg-[#071309] rounded-xl p-1 border border-[#1a3d22] mb-6">
            {(['login', 'signup'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); setSuccess(null) }}
                className={`flex-1 py-2 text-xs font-display font-600 uppercase tracking-widest rounded-lg transition-all ${
                  mode === m
                    ? 'bg-[#0d2416] text-[#00ff6a] border border-[#1a3d22]'
                    : 'text-[#4a6b50] hover:text-white'
                }`}
              >
                {m === 'login' ? 'Autentificare' : 'Cont Nou'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-[#4a6b50] mb-2 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-[#071309] border border-[#1a3d22] text-white rounded-lg px-4 py-3 text-sm font-mono focus:border-[#00ff6a] focus:outline-none focus:ring-1 focus:ring-[#00ff6a]/20 transition-colors"
                placeholder="email@exemplu.com"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-[#4a6b50] mb-2 uppercase tracking-wider">
                Parolă
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-[#071309] border border-[#1a3d22] text-white rounded-lg px-4 py-3 text-sm font-mono focus:border-[#00ff6a] focus:outline-none focus:ring-1 focus:ring-[#00ff6a]/20 transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-950/30 border border-red-800/40 rounded-lg p-3 text-red-400 text-sm font-mono">
                ⚠ {error}
              </div>
            )}

            {success && (
              <div className="bg-green-950/30 border border-green-800/40 rounded-lg p-3 text-[#00ff6a] text-sm font-mono">
                ✓ {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00ff6a] text-black font-display font-700 uppercase tracking-widest text-sm rounded-lg px-6 py-3 hover:bg-[#00c950] disabled:opacity-30 disabled:cursor-not-allowed transition-all glow-green mt-2"
            >
              {loading ? 'Se procesează...' : mode === 'login' ? '→ Intră în cont' : '→ Creează cont'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs font-mono text-[#1a3d22]/60">
              Plan gratuit include predicții de bază.
            </p>
            <a
              href="https://florianparv.gumroad.com/l/lnjfx"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-[#00ff6a]/40 hover:text-[#00ff6a] transition-colors mt-1 inline-block"
            >
              Upgrade la Pro (99 RON/lună) →
            </a>
          </div>
        </div>

        <div className="text-center mt-4">
          <a href="/" className="text-xs font-mono text-[#1a3d22]/50 hover:text-[#4a6b50] transition-colors">
            ← Înapoi la predicții
          </a>
        </div>
      </div>
    </div>
  )
}
