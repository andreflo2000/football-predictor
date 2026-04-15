'use client'

import { useState, useEffect } from 'react'
import { useAuth, canAccessPro } from '@/lib/auth'
import { useRouter } from 'next/navigation'

interface DailyPick {
  id: number
  match: string
  league: string
  pick: string
  confidence: number
  confidence_label: string
  kelly_pct: number
  edge_pct: number
  value_bet: boolean
  is_vip: boolean
  odds: number | null
  match_date: string
  result?: string | null
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function PicksPage() {
  const { user, session, loading } = useAuth()
  const router = useRouter()
  const [picks, setPicks] = useState<DailyPick[]>([])
  const [picksLoading, setPicksLoading] = useState(true)
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [userRole, setUserRole] = useState('free')

  useEffect(() => {
    fetchPicks()
  }, [date, session])

  const fetchPicks = async () => {
    setPicksLoading(true)
    try {
      const headers: Record<string, string> = {}
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      const res = await fetch(`${API_BASE}/api/daily-picks?date=${date}`, { headers })
      const data = await res.json()
      setPicks(data.picks || [])
      setUserRole(data.user_role || 'free')
    } catch {
      setPicks([])
    } finally {
      setPicksLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen pitch-grid scanlines flex items-center justify-center">
        <div className="text-[#00ff6a] font-mono text-sm animate-pulse">Se încarcă...</div>
      </div>
    )
  }

  const confidenceColor = (label: string) => {
    if (label === 'HIGH') return 'text-[#00ff6a] border-[#00ff6a]/30 bg-[#00ff6a]/5'
    if (label === 'MEDIUM') return 'text-yellow-400 border-yellow-800/30 bg-yellow-900/5'
    return 'text-[#4a6b50] border-[#1a3d22] bg-transparent'
  }

  return (
    <div className="min-h-screen pitch-grid scanlines">
      {/* Header */}
      <header className="border-b border-[#1a3d22] bg-[#050f08]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#00ff6a] flex items-center justify-center">
                <span className="text-black font-bold text-xs">⚽</span>
              </div>
              <h1 className="font-display font-800 text-xl tracking-widest text-white uppercase glow-text">
                Oxiano
              </h1>
            </a>
            <span className="text-[#1a3d22] text-sm">›</span>
            <span className="font-display text-sm text-[#00ff6a]/60 uppercase tracking-widest">Daily Picks</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono px-2 py-1 rounded border ${
                  userRole === 'pro' || userRole === 'owner'
                    ? 'text-[#00ff6a] border-[#00ff6a]/30 bg-[#00ff6a]/5'
                    : userRole === 'analyst'
                    ? 'text-yellow-400 border-yellow-800/30'
                    : 'text-[#4a6b50] border-[#1a3d22]'
                }`}>
                  {userRole.toUpperCase()}
                </span>
                <span className="text-xs font-mono text-[#4a6b50] hidden sm:block">{user.email}</span>
              </div>
            ) : (
              <a
                href="/login"
                className="text-xs font-mono text-[#00ff6a]/60 hover:text-[#00ff6a] transition-colors border border-[#1a3d22] px-3 py-1 rounded"
              >
                Login →
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Date selector */}
        <div className="ticket-card p-5 mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="font-display font-700 text-lg uppercase tracking-widest text-white">
              Pick-urile Zilei
            </h2>
            <p className="text-xs font-mono text-[#4a6b50] mt-1">
              {userRole === 'free' ? 'Cont gratuit — pick-urile VIP ascunse' : `Acces ${userRole.toUpperCase()}`}
            </p>
          </div>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="bg-[#071309] border border-[#1a3d22] text-white rounded-lg px-4 py-2 text-sm font-mono focus:border-[#00ff6a] focus:outline-none"
          />
        </div>

        {/* Upgrade banner pentru free */}
        {userRole === 'free' && (
          <div className="ticket-card p-5 mb-6 border-[#00ff6a]/20">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-display font-700 text-sm uppercase tracking-widest text-[#00ff6a]">
                  💎 Pick-urile VIP sunt ascunse
                </p>
                <p className="text-xs font-mono text-[#4a6b50] mt-1">
                  Upgrade la Pro (99 RON/lună) pentru toate pick-urile + Value Bet
                </p>
              </div>
              <a
                href="https://florianparv.gumroad.com/l/lnjfx"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#00ff6a] text-black font-display font-700 uppercase tracking-widest text-xs rounded-lg px-4 py-2 hover:bg-[#00c950] transition-all glow-green"
              >
                Upgrade Pro →
              </a>
            </div>
          </div>
        )}

        {/* Picks list */}
        {picksLoading ? (
          <div className="text-center py-16 text-[#00ff6a]/40 font-mono text-sm animate-pulse">
            Se încarcă pick-urile...
          </div>
        ) : picks.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4 opacity-20">📋</div>
            <p className="font-display text-[#1a3d22] uppercase tracking-[0.3em] text-sm">
              Nu sunt pick-uri pentru {date}
            </p>
            <p className="text-xs font-mono text-[#1a3d22]/50 mt-2">
              Pick-urile sunt adăugate dimineața de către analist
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {picks.map(pick => (
              <div key={pick.id} className="ticket-card p-5 relative overflow-hidden">
                {pick.is_vip && (
                  <div className="absolute top-3 right-3">
                    <span className="text-xs font-mono text-[#00ff6a] border border-[#00ff6a]/30 bg-[#00ff6a]/5 px-2 py-0.5 rounded">
                      💎 VIP
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-mono text-[#4a6b50] uppercase tracking-widest mb-1">
                      {pick.league}
                    </p>
                    <p className="font-display font-700 text-lg uppercase tracking-wide text-white leading-tight">
                      {pick.match}
                    </p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="font-display font-700 text-2xl text-[#00ff6a]">
                        {pick.pick}
                      </span>
                      {pick.odds && (
                        <span className="text-sm font-mono text-[#4a6b50]">
                          @ {pick.odds.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Indicators */}
                  <div className="grid grid-cols-2 gap-2 text-right">
                    <div className={`border rounded-lg px-3 py-2 ${confidenceColor(pick.confidence_label)}`}>
                      <p className="text-[10px] font-mono uppercase tracking-widest opacity-60">Confidence</p>
                      <p className="font-display font-700 text-lg">{pick.confidence}%</p>
                      <p className="text-[10px] font-mono uppercase">{pick.confidence_label}</p>
                    </div>

                    <div className="border border-[#1a3d22] rounded-lg px-3 py-2">
                      <p className="text-[10px] font-mono text-[#4a6b50] uppercase tracking-widest">Kelly %</p>
                      <p className="font-display font-700 text-lg text-white">{pick.kelly_pct}%</p>
                      <p className="text-[10px] font-mono text-[#4a6b50]">bankroll</p>
                    </div>

                    {canAccessPro(userRole) && (
                      <div className="border border-[#1a3d22] rounded-lg px-3 py-2">
                        <p className="text-[10px] font-mono text-[#4a6b50] uppercase tracking-widest">Edge %</p>
                        <p className="font-display font-700 text-lg text-white">
                          {pick.edge_pct > 0 ? `+${pick.edge_pct}%` : '—'}
                        </p>
                        <p className="text-[10px] font-mono text-[#4a6b50]">vs Pinnacle</p>
                      </div>
                    )}

                    {pick.value_bet && (
                      <div className="border border-[#00ff6a]/30 bg-[#00ff6a]/5 rounded-lg px-3 py-2 flex flex-col items-center justify-center">
                        <p className="text-lg">💎</p>
                        <p className="text-[10px] font-mono text-[#00ff6a] uppercase tracking-widest">Value Bet</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Result (dacă e disponibil) */}
                {pick.result && (
                  <div className={`mt-3 pt-3 border-t border-[#1a3d22] flex items-center gap-2`}>
                    <span className={`text-xs font-mono px-2 py-1 rounded border ${
                      pick.result === 'WIN'
                        ? 'text-[#00ff6a] border-[#00ff6a]/30 bg-[#00ff6a]/5'
                        : pick.result === 'LOSS'
                        ? 'text-red-400 border-red-800/30 bg-red-950/20'
                        : 'text-yellow-400 border-yellow-800/30'
                    }`}>
                      {pick.result === 'WIN' ? '✓ WIN' : pick.result === 'LOSS' ? '✗ LOSS' : '~ VOID'}
                    </span>
                    <span className="text-xs font-mono text-[#4a6b50]">Rezultat final</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
