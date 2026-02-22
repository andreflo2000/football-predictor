'use client'

import { useState, useEffect } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ─── Date helpers ─────────────────────────────────────────────────────────────
function getTodayRO() {
  return new Date().toLocaleDateString('ro-RO', {
    timeZone: 'Europe/Bucharest',
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).replace(/\//g, '.')
}

function getDateOffset(offset: number) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return {
    display: d.toLocaleDateString('ro-RO', {
      timeZone: 'Europe/Bucharest',
      day: '2-digit', month: '2-digit', year: 'numeric'
    }).replace(/\//g, '.'),
    iso: d.toISOString().split('T')[0],
  }
}

const TABS = [
  { key: 'yesterday', label: 'Ieri',      offset: -1 },
  { key: 'today',     label: 'Azi',       offset:  0 },
  { key: 'tomorrow',  label: 'Mâine',     offset:  1 },
  { key: 'after',     label: 'Poimâine',  offset:  2 },
]

function getProbColor(p: number) {
  if (p >= 65) return '#10b981'
  if (p >= 45) return '#f59e0b'
  return '#ef4444'
}

// ─── Result checker (localStorage) ───────────────────────────────────────────
function getResults(): Record<string, 'correct' | 'wrong' | null> {
  try { return JSON.parse(localStorage.getItem('fp_results') || '{}') } catch { return {} }
}
function saveResult(id: string, val: 'correct' | 'wrong' | null) {
  const results = getResults()
  if (val === null) delete results[id]
  else results[id] = val
  localStorage.setItem('fp_results', JSON.stringify(results))
}

// ─── Components ───────────────────────────────────────────────────────────────
function MarketRow({ market }: { market: any }) {
  const isInfo = market.odds === null
  const color = isInfo ? '#475569' : getProbColor(market.probability)
  return (
    <div className="market-row">
      <span className="text-xs text-gray-400 flex-1 truncate">{market.name}</span>
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-16 prob-bar">
          <div className="h-full rounded-full" style={{ width: `${Math.min(market.probability,100)}%`, backgroundColor: color }} />
        </div>
        <span className="text-xs font-semibold w-10 text-right font-mono" style={{ color }}>
          {isInfo ? `~${market.probability}` : `${market.probability}%`}
        </span>
        {market.odds && <span className="text-[10px] text-gray-600 w-8 text-right font-mono">{market.odds}</span>}
      </div>
    </div>
  )
}

function MarketSection({ market }: { market: any }) {
  const [expanded, setExpanded] = useState(false)
  const preview = market.markets.slice(0, 4)
  const rest = market.markets.slice(4)
  return (
    <div className="bg-blue-950/60 rounded-lg border border-blue-900/50 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-900/30 border-b border-blue-900/40">
        <span>{market.icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-blue-200">{market.label}</span>
      </div>
      <div className="p-2 space-y-0.5">
        {preview.map((m: any, i: number) => <MarketRow key={i} market={m} />)}
        {rest.length > 0 && (
          <>
            {expanded && rest.map((m: any, i: number) => <MarketRow key={i+4} market={m} />)}
            <button onClick={() => setExpanded(!expanded)}
              className="w-full text-[11px] font-mono text-blue-600 hover:text-blue-400 py-1 transition-colors">
              {expanded ? '▲ Mai puțin' : `▼ +${rest.length} opțiuni`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function MatchCard({ match, isYesterday }: { match: any; isYesterday: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null)
  const matchId = `${match.fixture_id}-${match.date}`

  useEffect(() => {
    setResult(getResults()[matchId] ?? null)
  }, [matchId])

  const handleResult = (val: 'correct' | 'wrong') => {
    const newVal = result === val ? null : val
    setResult(newVal)
    saveResult(matchId, newVal)
  }

  const m = match.markets
  const home = m?.match_result?.markets?.[0]?.probability ?? 0
  const draw = m?.match_result?.markets?.[1]?.probability ?? 0
  const away = m?.match_result?.markets?.[2]?.probability ?? 0

  const sections = m ? [
    m.match_result, m.double_chance, m.over_under, m.btts,
    m.halftime_goal, m.halftime_over_under, m.halftime_result,
    m.exact_score, m.combo, m.corners, m.cards,
  ].filter(Boolean) : []

  const cardBorder = isYesterday
    ? result === 'correct' ? 'border-green-500/50' : result === 'wrong' ? 'border-red-500/50' : 'border-blue-900/40'
    : 'border-blue-900/40'

  return (
    <div className={`card mb-3 overflow-hidden fade-in border ${cardBorder}`}
      style={result === 'correct' ? { boxShadow: '0 0 16px rgba(16,185,129,0.12)' } :
             result === 'wrong'   ? { boxShadow: '0 0 16px rgba(239,68,68,0.12)' } : {}}>

      <button className="w-full p-4 text-left" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between mb-3">
          <span className="badge badge-blue text-xs">
            {match.league?.flag} {match.league?.name}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-500">{match.date}</span>
            <span className="text-blue-600 text-xs">{expanded ? '▲' : '▼'}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 text-right">
            <p className="font-display text-lg text-white tracking-wide">{match.home}</p>
            <p className="text-xl font-display mt-0.5" style={{ color: getProbColor(home) }}>{home}%</p>
          </div>
          <div className="text-center">
            <div className="text-xs font-mono text-gray-500 uppercase">vs</div>
            <div className="text-sm font-semibold text-gray-400 mt-0.5">X {draw}%</div>
          </div>
          <div className="flex-1 text-left">
            <p className="font-display text-lg text-white tracking-wide">{match.away}</p>
            <p className="text-xl font-display mt-0.5" style={{ color: getProbColor(away) }}>{away}%</p>
          </div>
        </div>

        <div className="score-bar mt-3">
          <div className="prob-fill-blue rounded-l-full" style={{ flex: home }} />
          <div className="prob-fill-draw" style={{ flex: draw }} />
          <div className="prob-fill-red rounded-r-full" style={{ flex: away }} />
        </div>

        <div className="flex gap-3 mt-2 text-[11px] font-mono text-gray-500">
          <span>xG {m?.expected_goals?.home ?? '?'} : {m?.expected_goals?.away ?? '?'}</span>
          <span>•</span>
          <span>Elo {match.home_elo} / {match.away_elo}</span>
        </div>
      </button>

      {/* ── Result checker (doar ieri) ── */}
      {isYesterday && (
        <div className="border-t border-blue-900/30 px-4 py-3 flex items-center gap-3">
          <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Predicție corectă?</span>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => handleResult('correct')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                result === 'correct'
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                  : 'bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20'
              }`}
            >
              ✓ Da, corect
            </button>
            <button
              onClick={() => handleResult('wrong')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                result === 'wrong'
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                  : 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
              }`}
            >
              ✗ Nu, greșit
            </button>
            {result && (
              <button
                onClick={() => handleResult(result)}
                className="px-2 py-1.5 rounded-lg text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Markets expanded ── */}
      {expanded && (
        <div className="border-t border-blue-900/40 p-4">
          <p className="text-[11px] font-mono text-blue-600/50 uppercase tracking-widest mb-3">
            Toate piețele de pariuri
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {sections.map((s: any, i: number) => <MarketSection key={i} market={s} />)}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Stats bar pentru Ieri ─────────────────────────────────────────────────────
function YesterdayStats({ matches }: { matches: any[] }) {
  const [results, setResults] = useState<Record<string, 'correct' | 'wrong' | null>>({})

  useEffect(() => { setResults(getResults()) }, [])

  const total = matches.length
  const checked = matches.filter(m => results[`${m.fixture_id}-${m.date}`]).length
  const correct = matches.filter(m => results[`${m.fixture_id}-${m.date}`] === 'correct').length
  const wrong = matches.filter(m => results[`${m.fixture_id}-${m.date}`] === 'wrong').length
  const rate = checked > 0 ? Math.round((correct / checked) * 100) : null

  if (checked === 0) return null

  return (
    <div className="card p-4 mb-4 fade-in">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">Rezultatele tale de ieri</span>
        {rate !== null && (
          <span className={`badge ${rate >= 60 ? 'badge-green' : rate >= 40 ? 'badge-amber' : 'badge-red'}`}>
            {rate}% rată succes
          </span>
        )}
      </div>
      <div className="flex gap-6 mt-3">
        <div className="text-center">
          <div className="font-display text-2xl text-white">{total}</div>
          <div className="text-[10px] font-mono text-gray-500 uppercase">Total</div>
        </div>
        <div className="text-center">
          <div className="font-display text-2xl text-green-400">{correct}</div>
          <div className="text-[10px] font-mono text-gray-500 uppercase">Corecte</div>
        </div>
        <div className="text-center">
          <div className="font-display text-2xl text-red-400">{wrong}</div>
          <div className="text-[10px] font-mono text-gray-500 uppercase">Greșite</div>
        </div>
        <div className="text-center">
          <div className="font-display text-2xl text-gray-500">{total - checked}</div>
          <div className="text-[10px] font-mono text-gray-500 uppercase">Nebifate</div>
        </div>
      </div>
      {checked > 0 && (
        <div className="prob-bar mt-3">
          <div className="h-full rounded-l-full bg-green-500" style={{ width: `${(correct/total)*100}%` }} />
          <div className="h-full bg-red-500" style={{ width: `${(wrong/total)*100}%` }} />
          <div className="h-full rounded-r-full bg-gray-700" style={{ width: `${((total-checked)/total)*100}%` }} />
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function WeeklyPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('today')

  // Calculăm datele pentru fiecare tab
  const tabDates = TABS.reduce((acc, t) => {
    acc[t.key] = getDateOffset(t.offset)
    return acc
  }, {} as Record<string, { display: string; iso: string }>)

  useEffect(() => {
    fetch(`${API_BASE}/api/weekly`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Filtrează meciurile după data ISO
  const getMatchesForTab = (tabKey: string) => {
    if (!data?.days) return []
    const targetDate = tabDates[tabKey].iso
    const allMatches: any[] = []
    Object.values(data.days).forEach((day: any) => {
      day.matches?.forEach((m: any) => {
        if (m.date === targetDate) allMatches.push(m)
      })
    })
    // Dacă nu avem meciuri exact pe data respectivă, distribuim round-robin pentru demo
    if (allMatches.length === 0) {
      const allM: any[] = []
      Object.values(data.days).forEach((day: any) => allM.push(...(day.matches || [])))
      const tabIdx = TABS.findIndex(t => t.key === tabKey)
      return allM.filter((_: any, i: number) => i % 4 === tabIdx)
    }
    return allMatches
  }

  if (loading) return (
    <div className="app-bg grid-bg min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="spinner mx-auto mb-4" />
        <p className="text-blue-300 text-sm font-mono uppercase tracking-widest">Se încarcă predicțiile...</p>
      </div>
    </div>
  )

  const matches = getMatchesForTab(activeTab)
  const isYesterday = activeTab === 'yesterday'

  return (
    <div className="app-bg grid-bg min-h-screen">
      {/* Header */}
      <header className="header">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm">⚽</div>
            <span className="font-display text-xl text-white tracking-widest">FOOTPREDICT</span>
          </div>
          <nav className="flex items-center gap-1">
            <a href="/" className="nav-link">Predicții</a>
            <a href="/weekly" className="nav-link active">Săptămâna</a>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Title */}
        <div className="mb-8 fade-in">
          <h1 className="font-display text-4xl text-white tracking-widest mb-1">MECIURILE PROGRAMATE</h1>
          <p className="text-xs font-mono text-blue-400 uppercase tracking-widest">
            {data?.total_matches} meciuri · 100 ligi
          </p>
        </div>

        {/* Day tabs */}
        <div className="tab-bar mb-6 fade-in">
          {TABS.map(tab => {
            const count = getMatchesForTab(tab.key).length
            const isActive = activeTab === tab.key
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`tab ${isActive ? 'active' : ''}`}>
                <div className="font-semibold text-sm">{tab.label}</div>
                <div className={`text-[10px] font-mono mt-0.5 ${isActive ? 'text-blue-300' : 'text-gray-600'}`}>
                  {tabDates[tab.key].display}
                </div>
                <div className={`text-[10px] font-mono ${isActive ? 'text-blue-400' : 'text-gray-700'}`}>
                  {count} meciuri
                </div>
              </button>
            )
          })}
        </div>

        {/* Yesterday stats */}
        {isYesterday && matches.length > 0 && <YesterdayStats matches={matches} />}

        {/* Yesterday tip */}
        {isYesterday && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-blue-900/20 border border-blue-900/40">
            <span className="text-sm">💡</span>
            <p className="text-xs font-mono text-blue-400">
              Bifează fiecare meci cu ✓ sau ✗ pentru a urmări rata de succes a predicțiilor tale
            </p>
          </div>
        )}

        {/* Legend */}
        <div className="flex gap-4 mb-4 items-center">
          {[['#10b981','>65%'],['#f59e0b','45-65%'],['#ef4444','<45%']].map(([c,l]) => (
            <div key={l} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c as string }} />
              <span className="text-[11px] text-gray-500 font-mono">{l}</span>
            </div>
          ))}
          <div className="ml-auto text-[11px] text-gray-600 font-mono hidden sm:block">
            Click pe meci pentru toate piețele
          </div>
        </div>

        {/* Matches */}
        {matches.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl opacity-10 mb-4">📅</div>
            <p className="font-display text-xl text-gray-600 tracking-widest">NICIO LIGĂ PROGRAMATĂ</p>
          </div>
        ) : (
          matches.map((m: any) => (
            <MatchCard key={`${m.fixture_id}-${m.date}`} match={m} isYesterday={isYesterday} />
          ))
        )}
      </main>

      <footer className="border-t border-blue-900/30 mt-8 py-4">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-[11px] font-mono text-gray-700">
            Predicțiile sunt generate statistic · Scop educațional · Nu reprezintă sfaturi de pariuri
          </p>
        </div>
      </footer>
    </div>
  )
}
