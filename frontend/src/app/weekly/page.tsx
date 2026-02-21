'use client'

import { useState, useEffect } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const DAYS = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică']

function getProbColor(p: number) {
  if (p >= 65) return '#10b981'
  if (p >= 45) return '#f59e0b'
  return '#ef4444'
}

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

function MatchCard({ match }: { match: any }) {
  const [expanded, setExpanded] = useState(false)
  const m = match.markets
  const home = m?.match_result?.markets?.[0]?.probability ?? 0
  const draw = m?.match_result?.markets?.[1]?.probability ?? 0
  const away = m?.match_result?.markets?.[2]?.probability ?? 0

  const sections = m ? [
    m.match_result, m.double_chance, m.over_under, m.btts,
    m.halftime_goal, m.halftime_over_under, m.halftime_result,
    m.exact_score, m.combo, m.corners, m.cards,
  ].filter(Boolean) : []

  return (
    <div className="card mb-3 overflow-hidden fade-in">
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

export default function WeeklyPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeDay, setActiveDay] = useState('')

  useEffect(() => {
    fetch(`${API_BASE}/api/weekly`)
      .then(r => r.json())
      .then(d => {
        setData(d)
        const max = Object.entries(d.days || {})
          .sort((a: any, b: any) => b[1].total_matches - a[1].total_matches)[0]?.[0] ?? DAYS[4]
        setActiveDay(max)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="app-bg grid-bg min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="spinner mx-auto mb-4" />
        <p className="text-blue-300 text-sm font-mono uppercase tracking-widest">Se încarcă predicțiile...</p>
      </div>
    </div>
  )

  const currentDay = data?.days?.[activeDay]
  const matches = currentDay?.matches ?? []

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
          <h1 className="font-display text-4xl text-white tracking-widest mb-1">MECIURILE SĂPTĂMÂNII</h1>
          <p className="text-xs font-mono text-blue-400 uppercase tracking-widest">
            {data?.week_start} → {data?.week_end} · {data?.total_matches} meciuri · 100 ligi
          </p>
        </div>

        {/* Day tabs */}
        <div className="tab-bar mb-6 overflow-x-auto fade-in">
          {DAYS.map(day => {
            const count = data?.days?.[day]?.total_matches ?? 0
            return (
              <button key={day} onClick={() => setActiveDay(day)}
                className={`tab ${activeDay === day ? 'active' : ''}`}>
                <div className="font-semibold">{day}</div>
                <div className={`text-[10px] font-mono mt-0.5 ${activeDay === day ? 'text-blue-300' : 'text-gray-600'}`}>
                  {count} meciuri
                </div>
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mb-4">
          {[['#10b981','>65%'],['#f59e0b','45-65%'],['#ef4444','<45%']].map(([c,l]) => (
            <div key={l} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c as string }} />
              <span className="text-[11px] text-gray-500 font-mono">{l}</span>
            </div>
          ))}
          <div className="ml-auto text-[11px] text-gray-600 font-mono">Click pe meci pentru toate piețele</div>
        </div>

        {/* Matches */}
        {matches.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl opacity-10 mb-4">📅</div>
            <p className="font-display text-xl text-gray-600 tracking-widest">NICIO LIGĂ PROGRAMATĂ</p>
          </div>
        ) : matches.map((m: any) => <MatchCard key={m.fixture_id} match={m} />)}
      </main>

      <footer className="border-t border-blue-900/30 mt-8 py-4">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-[11px] font-mono text-gray-700">
            Predicțiile sunt generate statistic. Scop educațional — nu reprezintă sfaturi de pariuri.
          </p>
        </div>
      </footer>
    </div>
  )
}
