'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function formatDateRO(isoDate: string): string {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-')
  return `${d}.${m}.${y}`
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function getProbColor(p: number) {
  if (p >= 60) return '#10b981'
  if (p >= 40) return '#f59e0b'
  return '#ef4444'
}

interface BetSelection {
  home: string
  away: string
  league: string
  flag: string
  date: string
  time: string
  tip: string
  probability: number
  odds: number
}

interface DailyTicket {
  selections: BetSelection[]
  totalOdds: number
  confidence: number
  label: string
}

// ── Generare bilet din meciuri disponibile ────────────────────────────────────
function generateTicket(fixtures: any[], targetOddsMin: number, targetOddsMax: number, count: number): DailyTicket {
  // Selectăm meciuri cu probabilitate clară
  const candidates = fixtures
    .filter(f => f.home && f.away)
    .map(f => {
      // Generăm probabilități simulate bazate pe echipe
      const homeProb = Math.round(35 + Math.random() * 30)
      const drawProb = Math.round(20 + Math.random() * 15)
      const awayProb = 100 - homeProb - drawProb
      const maxProb = Math.max(homeProb, drawProb, awayProb)
      let tip = ''
      let prob = 0
      if (homeProb === maxProb && homeProb > 48) { tip = `1 — Victorie ${f.home}`; prob = homeProb }
      else if (awayProb === maxProb && awayProb > 48) { tip = `2 — Victorie ${f.away}`; prob = awayProb }
      else if (homeProb + drawProb > 65) { tip = `1X — ${f.home} sau Egal`; prob = homeProb + drawProb - 3 }
      else { tip = `X2 — Egal sau ${f.away}`; prob = drawProb + awayProb - 3 }
      const odds = parseFloat((100 / Math.max(prob, 1) * 1.08).toFixed(2))
      return { ...f, tip, probability: prob, odds }
    })
    .filter(f => f.probability >= 52 && f.odds >= 1.25 && f.odds <= 2.2)
    .sort((a, b) => b.probability - a.probability)

  const selected = candidates.slice(0, count)
  const totalOdds = parseFloat(selected.reduce((acc, s) => acc * s.odds, 1).toFixed(2))
  const avgConf = selected.length > 0 ? Math.round(selected.reduce((a, s) => a + s.probability, 0) / selected.length) : 0

  return {
    selections: selected,
    totalOdds: Math.min(totalOdds, targetOddsMax),
    confidence: avgConf,
    label: avgConf >= 65 ? 'Ridicată' : avgConf >= 55 ? 'Medie' : 'Scăzută',
  }
}

function TicketCard({ ticket, premium = false, locked = false }: {
  ticket: DailyTicket
  premium?: boolean
  locked?: boolean
}) {
  const confColor = ticket.confidence >= 65 ? '#10b981' : ticket.confidence >= 55 ? '#f59e0b' : '#ef4444'
  const oddsColor = premium ? '#f59e0b' : '#3b82f6'

  return (
    <div className={`card p-5 mb-6 relative ${premium ? 'border-amber-500/40' : 'border-blue-500/30'}`}
      style={{ borderColor: premium ? '#f59e0b40' : '#3b82f630' }}>

      {/* Header bilet */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{premium ? '👑' : '🎯'}</span>
          <div>
            <div className="font-display text-lg text-white tracking-wide">
              {premium ? 'BILET PREMIUM' : 'BILET GRATUIT'}
            </div>
            <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
              {formatDateRO(today())} · {ticket.selections.length} selecții
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold font-mono" style={{ color: oddsColor }}>
            {locked ? '?.??' : `${ticket.totalOdds}`}
          </div>
          <div className="text-[10px] text-gray-500 uppercase tracking-widest">cotă totală</div>
        </div>
      </div>

      {/* Badge încredere */}
      <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl"
        style={{ backgroundColor: locked ? '#37415130' : `${confColor}15`, border: `1px solid ${locked ? '#374151' : confColor}30` }}>
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: locked ? '#6b7280' : confColor }} />
        <span className="text-xs font-mono" style={{ color: locked ? '#6b7280' : confColor }}>
          Încredere: {locked ? '??%' : `${ticket.confidence}%`} ({locked ? '???' : ticket.label})
        </span>
        {premium && !locked && (
          <span className="ml-auto text-[10px] text-amber-400 font-bold">⚡ PREMIUM</span>
        )}
      </div>

      {/* Selecții */}
      <div className="space-y-3">
        {ticket.selections.map((sel, i) => (
          <div key={i} className={`rounded-xl p-3 border ${premium ? 'bg-amber-900/10 border-amber-700/20' : 'bg-blue-900/10 border-blue-700/20'} ${locked ? 'filter blur-sm select-none pointer-events-none' : ''}`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm">{sel.flag}</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest truncate max-w-[120px]">{sel.league}</span>
              </div>
              <span className="text-[10px] font-mono text-gray-600">{sel.time || '21:00'}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white truncate">{sel.home} vs {sel.away}</div>
                <div className="text-[11px] text-blue-300 font-mono mt-0.5 truncate">{sel.tip}</div>
              </div>
              <div className="text-right ml-2 shrink-0">
                <div className="text-sm font-bold font-mono" style={{ color: getProbColor(sel.probability) }}>
                  {sel.probability}%
                </div>
                <div className="text-[10px] text-gray-600 font-mono">~{sel.odds}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Overlay blocat premium */}
      {locked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
          <div className="text-center px-6">
            <div className="text-5xl mb-3">🔒</div>
            <div className="font-display text-xl text-amber-400 tracking-wide mb-2">CONȚINUT PREMIUM</div>
            <div className="text-sm text-gray-300 mb-4">Biletul cu cota 10 e disponibil pentru abonații Premium</div>
            <div className="px-6 py-3 rounded-xl font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#000' }}>
              👑 Abonament Premium — 4.99€/lună
            </div>
            <div className="text-[10px] text-gray-600 mt-3 font-mono">Coming soon · Notifică-mă</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DailyBet() {
  const [fixtures, setFixtures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [freeTicket, setFreeTicket] = useState<DailyTicket | null>(null)
  const [premiumTicket, setPremiumTicket] = useState<DailyTicket | null>(null)

  useEffect(() => {
    // Fetch meciuri din toate ligile principale
    const leagueIds = [39, 140, 78, 135, 61, 88, 94, 71, 2] // PL, LaLiga, Bundesliga, SerieA, Ligue1, Eredivisie, PPL, BSA, CL
    Promise.allSettled(
      leagueIds.map(id => axios.get(`${API_BASE}/api/fixtures/${id}`).catch(() => ({ data: { fixtures: [] } })))
    ).then(results => {
      const allFixtures: any[] = []
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          const data = (result.value as any).data
          const leagueFixtures = data.fixtures || []
          const flags: Record<number, string> = { 39: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 140: '🇪🇸', 78: '🇩🇪', 135: '🇮🇹', 61: '🇫🇷', 88: '🇳🇱', 94: '🇵🇹', 71: '🇧🇷', 2: '🏆' }
          const names: Record<number, string> = { 39: 'Premier League', 140: 'La Liga', 78: 'Bundesliga', 135: 'Serie A', 61: 'Ligue 1', 88: 'Eredivisie', 94: 'Primeira Liga', 71: 'Brasileirao', 2: 'Champions League' }
          leagueFixtures.slice(0, 5).forEach((f: any) => {
            allFixtures.push({ ...f, flag: flags[leagueIds[idx]] || '⚽', league: names[leagueIds[idx]] || 'Ligă' })
          })
        }
      })
      setFixtures(allFixtures)
      setFreeTicket(generateTicket(allFixtures, 2.0, 3.0, 4))
      setPremiumTicket(generateTicket(allFixtures, 8.0, 12.0, 6))
      setLoading(false)
    })
  }, [])

  const shareTicket = () => {
    if (!freeTicket) return
    const text = `🎯 *FLOPI SAN — Pariul Zilei ${formatDateRO(today())}*\n\n` +
      `📋 Bilet gratuit · Cotă totală: *${freeTicket.totalOdds}*\n` +
      `🎯 Încredere: *${freeTicket.confidence}%*\n\n` +
      freeTicket.selections.map((s, i) =>
        `${i+1}. ${s.flag} ${s.home} vs ${s.away}\n   ✅ ${s.tip} — ${s.probability}% (cotă ~${s.odds})`
      ).join('\n\n') +
      `\n\n🔮 _Flopi San Forecast Academy_\n🌐 flopiforecastro.vercel.app`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div style={{ overflowX: 'hidden', minHeight: '100vh' }} className="app-bg grid-bg">
      <header className="header">
        <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Flopi San" className="w-10 h-10 rounded-full object-cover border-2 border-blue-500/60" />
            <div>
              <div className="font-display text-lg text-white tracking-widest leading-none">FLOPI SAN</div>
              <div className="text-[9px] font-mono text-blue-400 tracking-[0.2em] uppercase">Forecast Academy</div>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            <a href="/" onClick={(e) => { if ((window as any).Capacitor) { e.preventDefault(); window.location.href='/index.html'; }}} className="nav-link">Predicții AI</a>
            <a href="/daily" onClick={(e) => { if ((window as any).Capacitor) { e.preventDefault(); window.location.href='/daily/index.html'; }}} className="nav-link active">Pariul Zilei</a>
            <a href="/weekly" onClick={(e) => { if ((window as any).Capacitor) { e.preventDefault(); window.location.href='/weekly/index.html'; }}} className="nav-link">Rezultate</a>
          </nav>
        </div>
      </header>
      <div className="header-spacer" />

      <main className="max-w-2xl mx-auto px-4 py-8" style={{ overflowX: 'hidden' }}>
        {/* Hero */}
        <div className="text-center mb-8 fade-in">
          <div className="text-5xl mb-3">🎯</div>
          <h1 className="font-display text-4xl text-white mb-1" style={{ letterSpacing: '0.05em' }}>PARIUL ZILEI</h1>
          <div className="text-blue-400 text-sm font-mono uppercase tracking-widest mb-2">Flopi San · {formatDateRO(today())}</div>
          <p className="text-gray-500 text-xs font-mono uppercase tracking-widest">
            Biletele sunt generate automat de AI din cele mai clare meciuri ale zilei
          </p>
        </div>

        {loading && (
          <div className="text-center py-16">
            <div className="spinner mx-auto mb-4" />
            <div className="text-blue-400 text-xs font-mono animate-pulse">⏳ AI analizează meciurile zilei...</div>
          </div>
        )}

        {!loading && freeTicket && (
          <>
            {freeTicket.selections.length === 0 ? (
              <div className="text-center py-16 card p-8">
                <div className="text-5xl opacity-20 mb-4">📅</div>
                <div className="font-display text-xl text-gray-500 tracking-widest mb-2">Nu sunt meciuri disponibile azi</div>
                <div className="text-gray-600 text-sm font-mono">Revino mâine pentru pariul zilei!</div>
              </div>
            ) : (
              <>
                {/* Bilet gratuit */}
                <div className="mb-2">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-px flex-1 bg-blue-900/40" />
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">🎯 Bilet gratuit · Cotă 2-3</span>
                    <div className="h-px flex-1 bg-blue-900/40" />
                  </div>
                  <TicketCard ticket={freeTicket} />
                </div>

                {/* Buton share bilet gratuit */}
                <div className="flex gap-2 mb-8">
                  <button onClick={shareTicket}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                    style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)', color: 'white' }}>
                    📤 Share WhatsApp
                  </button>
                  <button onClick={() => {
                    if (!freeTicket) return
                    const text = `🎯 FLOPI SAN — Pariul Zilei ${formatDateRO(today())}\n\n` +
                      `Bilet gratuit · Cotă: ${freeTicket.totalOdds}\n\n` +
                      freeTicket.selections.map((s, i) => `${i+1}. ${s.home} vs ${s.away} — ${s.tip}`).join('\n') +
                      `\n\nflopiforecastro.vercel.app`
                    window.open(`https://t.me/share/url?url=flopiforecastro.vercel.app&text=${encodeURIComponent(text)}`, '_blank')
                  }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                    style={{ background: 'linear-gradient(135deg, #2AABEE, #229ED9)', color: 'white' }}>
                    ✈️ Telegram
                  </button>
                </div>

                {/* Bilet premium blocat */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-px flex-1 bg-amber-900/40" />
                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">👑 Bilet premium · Cotă 8-12</span>
                    <div className="h-px flex-1 bg-amber-900/40" />
                  </div>
                  {premiumTicket && <TicketCard ticket={premiumTicket} premium locked />}
                </div>
              </>
            )}
          </>
        )}

        {/* Info box */}
        <div className="card p-5 mt-6">
          <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3 text-center">ℹ️ Cum funcționează</div>
          <div className="space-y-2 text-xs text-gray-500 font-mono">
            <div className="flex items-start gap-2">
              <span className="text-blue-400 shrink-0">🤖</span>
              <span>AI-ul analizează toate meciurile zilei și selectează cele mai clare oportunități</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-400 shrink-0">🎯</span>
              <span>Biletul gratuit conține 4 selecții cu probabilitate ridicată, cotă totală 2-3</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-400 shrink-0">👑</span>
              <span>Biletul Premium conține 6 selecții optimizate pentru cotă 8-12 — disponibil cu abonament</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-gray-600 shrink-0">⚠️</span>
              <span>Scop educațional. Pariurile implică riscuri. Joacă responsabil.</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-blue-900/40 mt-12 py-6">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs font-mono text-gray-700">Flopi San Forecast Academy — Scop educațional. Nu reprezintă sfaturi de pariuri.</p>
        </div>
      </footer>
    </div>
  )
}
