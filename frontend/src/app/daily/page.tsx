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
  leagueId: number
}

interface DailyTicket {
  selections: BetSelection[]
  totalOdds: number
  confidence: number
  label: string
}

const LEAGUES = [
  { id: 39,  flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', name: 'Premier League' },
  { id: 140, flag: '🇪🇸', name: 'La Liga' },
  { id: 78,  flag: '🇩🇪', name: 'Bundesliga' },
  { id: 135, flag: '🇮🇹', name: 'Serie A' },
  { id: 61,  flag: '🇫🇷', name: 'Ligue 1' },
  { id: 88,  flag: '🇳🇱', name: 'Eredivisie' },
  { id: 94,  flag: '🇵🇹', name: 'Primeira Liga' },
  { id: 71,  flag: '🇧🇷', name: 'Brasileirao' },
  { id: 2,   flag: '🏆', name: 'Champions League' },
]

// ── Fetch predictii reale pentru un meci ─────────────────────────────────────
async function fetchRealPrediction(fixture: any, leagueId: number): Promise<BetSelection | null> {
  try {
    const r = await axios.get(`${API_BASE}/api/predict`, {
      params: {
        home_team: fixture.home,
        away_team: fixture.away,
        league_id: leagueId,
        home_team_id: fixture.home_id || 0,
        away_team_id: fixture.away_id || 0,
      },
      timeout: 15000,
    })
    const data = r.data
    const pred = data.prediction || {}
    const home_w = pred.home_win ?? 0
    const draw   = pred.draw ?? 0
    const away_w = pred.away_win ?? 0

    // Găsim cel mai bun pariu
    let tip = ''
    let prob = 0

    if (home_w >= 55) {
      tip = `1 — Victorie ${fixture.home}`
      prob = home_w
    } else if (away_w >= 55) {
      tip = `2 — Victorie ${fixture.away}`
      prob = away_w
    } else if (home_w + draw >= 70) {
      tip = `1X — ${fixture.home} sau Egal`
      prob = Math.round((home_w + draw) * 0.95)
    } else if (draw + away_w >= 70) {
      tip = `X2 — Egal sau ${fixture.away}`
      prob = Math.round((draw + away_w) * 0.95)
    } else {
      // Verificăm Over/Under cu xG
      const xgHome = data.expected_goals?.home ?? 1.4
      const xgAway = data.expected_goals?.away ?? 1.2
      const totalXg = xgHome + xgAway
      if (totalXg > 2.5) {
        tip = 'Over 2.5 goluri'
        prob = Math.round(55 + (totalXg - 2.5) * 10)
      } else if (totalXg < 1.8) {
        tip = 'Under 2.5 goluri'
        prob = Math.round(60 + (1.8 - totalXg) * 10)
      } else {
        // Luăm maximul disponibil
        const maxProb = Math.max(home_w, draw, away_w)
        if (maxProb === home_w) { tip = `1 — Victorie ${fixture.home}`; prob = home_w }
        else if (maxProb === away_w) { tip = `2 — Victorie ${fixture.away}`; prob = away_w }
        else { tip = 'X — Egal'; prob = draw }
      }
    }

    if (prob < 50) return null // Nu includem pariuri cu probabilitate sub 50%

    const odds = parseFloat((100 / Math.max(prob, 1) * 1.08).toFixed(2))
    const league = LEAGUES.find(l => l.id === leagueId)

    return {
      home: fixture.home,
      away: fixture.away,
      league: league?.name || 'Ligă',
      flag: league?.flag || '⚽',
      date: fixture.date || today(),
      time: fixture.time || '',
      tip,
      probability: prob,
      odds,
      leagueId,
    }
  } catch {
    return null
  }
}

function buildTicket(selections: BetSelection[], count: number): DailyTicket {
  const selected = selections.slice(0, count)
  const totalOdds = parseFloat(selected.reduce((acc, s) => acc * s.odds, 1).toFixed(2))
  const avgConf = selected.length > 0
    ? Math.round(selected.reduce((a, s) => a + s.probability, 0) / selected.length)
    : 0
  return {
    selections: selected,
    totalOdds,
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
    <div className="card p-5 mb-6 relative"
      style={{ borderColor: premium ? '#f59e0b40' : '#3b82f630', borderWidth: '1px', borderStyle: 'solid' }}>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{premium ? '👑' : '🎯'}</span>
          <div>
            <div className="font-display text-lg text-white tracking-wide">
              {premium ? 'BILET PREMIUM' : 'BILET GRATUIT'}
            </div>
            <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
              {formatDateRO(today())} · {ticket.selections.length} selecții · Predicții AI reale
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

      <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl"
        style={{ backgroundColor: locked ? '#37415130' : `${confColor}15`, border: `1px solid ${locked ? '#374151' : confColor}30` }}>
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: locked ? '#6b7280' : confColor }} />
        <span className="text-xs font-mono" style={{ color: locked ? '#6b7280' : confColor }}>
          Încredere AI: {locked ? '??%' : `${ticket.confidence}%`} ({locked ? '???' : ticket.label})
        </span>
        {premium && !locked && <span className="ml-auto text-[10px] text-amber-400 font-bold">⚡ PREMIUM</span>}
      </div>

      <div className="space-y-3">
        {ticket.selections.map((sel, i) => (
          <div key={i} className={`rounded-xl p-3 border ${premium ? 'bg-amber-900/10 border-amber-700/20' : 'bg-blue-900/10 border-blue-700/20'} ${locked ? 'filter blur-sm select-none pointer-events-none' : ''}`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm">{sel.flag}</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest truncate max-w-[120px]">{sel.league}</span>
              </div>
              <span className="text-[10px] font-mono text-gray-600">{sel.time || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white truncate">{sel.home} vs {sel.away}</div>
                <div className="text-[11px] text-blue-300 font-mono mt-0.5 truncate">✅ {sel.tip}</div>
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

      {locked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl"
          style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(6px)' }}>
          <div className="text-center px-6">
            <div className="text-5xl mb-3">🔒</div>
            <div className="font-display text-xl text-amber-400 tracking-wide mb-2">CONȚINUT PREMIUM</div>
            <div className="text-sm text-gray-300 mb-1">Biletul cu cotă 8-12 e disponibil</div>
            <div className="text-sm text-gray-300 mb-4">pentru abonații Premium</div>
            <div className="px-6 py-3 rounded-xl font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#000' }}>
              👑 Abonament Premium — 4.99€/lună
            </div>
            <div className="text-[10px] text-gray-600 mt-3 font-mono">Coming soon</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DailyBet() {
  const [loading, setLoading] = useState(true)
  const [loadingText, setLoadingText] = useState('Se încarcă meciurile...')
  const [freeTicket, setFreeTicket] = useState<DailyTicket | null>(null)
  const [premiumTicket, setPremiumTicket] = useState<DailyTicket | null>(null)
  const [totalAnalyzed, setTotalAnalyzed] = useState(0)

  useEffect(() => {
    async function loadRealPredictions() {
      setLoadingText('Se încarcă meciurile din toate ligile...')

      // Pasul 1: Fetch toate meciurile din toate ligile
      const fixtureResults = await Promise.allSettled(
        LEAGUES.map(l => axios.get(`${API_BASE}/api/fixtures/${l.id}`).catch(() => ({ data: { fixtures: [] } })))
      )

      const allFixturesWithLeague: Array<{ fixture: any; leagueId: number }> = []
      fixtureResults.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          const fixtures = (result.value as any).data?.fixtures || []
          // Luăm primele 3 meciuri din fiecare ligă
          fixtures.slice(0, 3).forEach((f: any) => {
            allFixturesWithLeague.push({ fixture: f, leagueId: LEAGUES[idx].id })
          })
        }
      })

      setLoadingText(`AI analizează ${allFixturesWithLeague.length} meciuri... (poate dura 15-30 secunde)`)

      // Pasul 2: Fetch predicții reale pentru fiecare meci în paralel (maxim 12)
      const toAnalyze = allFixturesWithLeague.slice(0, 12)
      setTotalAnalyzed(toAnalyze.length)

      const predResults = await Promise.allSettled(
        toAnalyze.map(({ fixture, leagueId }) => fetchRealPrediction(fixture, leagueId))
      )

      // Pasul 3: Filtrăm și sortăm după probabilitate
      const validSelections: BetSelection[] = predResults
        .filter(r => r.status === 'fulfilled' && r.value !== null)
        .map(r => (r as PromiseFulfilledResult<BetSelection>).value)
        .sort((a, b) => b.probability - a.probability)

      // Pasul 4: Construim biletele
      // Bilet gratuit — top 4 cele mai sigure, cotă 2-3
      const freeSelections = validSelections
        .filter(s => s.probability >= 55 && s.odds <= 2.0)
        .slice(0, 4)

      // Bilet premium — 6 selecții cu probabilitate mai mare, cotă mai mare
      const premiumSelections = validSelections
        .filter(s => s.probability >= 52)
        .slice(0, 6)

      setFreeTicket(buildTicket(freeSelections, 4))
      setPremiumTicket(buildTicket(premiumSelections, 6))
      setLoading(false)
    }

    loadRealPredictions()
  }, [])

  const shareTicket = (platform: 'whatsapp' | 'telegram') => {
    if (!freeTicket) return
    const text = platform === 'whatsapp'
      ? `🎯 *FLOPI SAN — Pariul Zilei ${formatDateRO(today())}*\n\n` +
        `📋 Bilet gratuit · Cotă totală: *${freeTicket.totalOdds}*\n` +
        `🤖 Încredere AI: *${freeTicket.confidence}%* (${freeTicket.label})\n\n` +
        freeTicket.selections.map((s, i) =>
          `${i+1}. ${s.flag} *${s.home}* vs *${s.away}*\n   ✅ ${s.tip} — ${s.probability}% (cotă ~${s.odds})`
        ).join('\n\n') +
        `\n\n🔮 _Predicții generate de AI real — Flopi San Forecast Academy_\n🌐 flopiforecastro.vercel.app`
      : `🎯 FLOPI SAN — Pariul Zilei ${formatDateRO(today())}\n\n` +
        `Bilet gratuit · Cotă: ${freeTicket.totalOdds} · Încredere AI: ${freeTicket.confidence}%\n\n` +
        freeTicket.selections.map((s, i) => `${i+1}. ${s.flag} ${s.home} vs ${s.away}\n   ✅ ${s.tip} — ${s.probability}%`).join('\n\n') +
        `\n\n🔮 Flopi San Forecast Academy\n🌐 flopiforecastro.vercel.app`

    const url = platform === 'whatsapp'
      ? `https://wa.me/?text=${encodeURIComponent(text)}`
      : `https://t.me/share/url?url=flopiforecastro.vercel.app&text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
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
            <a href="/daily" onClick={(e) => { if ((window as any).Capacitor) { e.preventDefault(); window.location.href='/daily/index.html'; }}} className="nav-link active">🎯 Azi</a>
            <a href="/weekly" onClick={(e) => { if ((window as any).Capacitor) { e.preventDefault(); window.location.href='/weekly/index.html'; }}} className="nav-link">Rezultate</a>
          </nav>
        </div>
      </header>
      <div className="header-spacer" />

      <main className="max-w-2xl mx-auto px-4 py-8" style={{ overflowX: 'hidden' }}>
        <div className="text-center mb-8 fade-in">
          <div className="text-5xl mb-3">🎯</div>
          <h1 className="font-display text-4xl text-white mb-1" style={{ letterSpacing: '0.05em' }}>PARIUL ZILEI</h1>
          <div className="text-blue-400 text-sm font-mono uppercase tracking-widest mb-2">Flopi San · {formatDateRO(today())}</div>
          <p className="text-gray-500 text-xs font-mono uppercase tracking-widest">
            Predicții reale AI · XGBoost + Poisson + Elo
          </p>
        </div>

        {loading && (
          <div className="text-center py-16 card p-8">
            <div className="spinner mx-auto mb-6" />
            <div className="text-blue-400 text-sm font-mono mb-2">{loadingText}</div>
            {totalAnalyzed > 0 && (
              <div className="text-gray-600 text-xs font-mono">
                🤖 AI analizează {totalAnalyzed} meciuri cu modele reale...
              </div>
            )}
            <div className="text-gray-700 text-[10px] font-mono mt-4">
              Prima încărcare poate dura 15-30 secunde
            </div>
          </div>
        )}

        {!loading && freeTicket && (
          <>
            {freeTicket.selections.length === 0 ? (
              <div className="text-center py-16 card p-8">
                <div className="text-5xl opacity-20 mb-4">📅</div>
                <div className="font-display text-xl text-gray-500 tracking-widest mb-2">Nu sunt meciuri clare azi</div>
                <div className="text-gray-600 text-sm font-mono">AI-ul nu a găsit pariuri cu probabilitate suficientă. Revino mâine!</div>
              </div>
            ) : (
              <>
                {/* Bilet gratuit */}
                <div className="mb-2">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-px flex-1 bg-blue-900/40" />
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">🎯 Bilet gratuit · Predicții AI reale</span>
                    <div className="h-px flex-1 bg-blue-900/40" />
                  </div>
                  <TicketCard ticket={freeTicket} />
                </div>

                <div className="flex gap-2 mb-8">
                  <button onClick={() => shareTicket('whatsapp')}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                    style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)', color: 'white' }}>
                    📤 WhatsApp
                  </button>
                  <button onClick={() => shareTicket('telegram')}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                    style={{ background: 'linear-gradient(135deg, #2AABEE, #229ED9)', color: 'white' }}>
                    ✈️ Telegram
                  </button>
                </div>

                {/* Bilet premium */}
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

        <div className="card p-5 mt-6">
          <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3 text-center">ℹ️ Cum funcționează</div>
          <div className="space-y-2 text-xs text-gray-500 font-mono">
            <div className="flex items-start gap-2">
              <span className="text-blue-400 shrink-0">🤖</span>
              <span>AI-ul rulează modelul XGBoost + Poisson + Elo pe fiecare meci al zilei</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-400 shrink-0">🎯</span>
              <span>Selectează automat cele mai clare oportunități cu probabilitate reală</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-400 shrink-0">👑</span>
              <span>Biletul Premium conține 6 selecții — disponibil cu abonament 4.99€/lună</span>
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
<a href="/privacy" className="text-xs font-mono text-blue-600 hover:text-blue-400 mt-1 block">Politică de confidențialitate</a>
        </div>
      </footer>
    </div>
  )
}
