'use client'

import { useState, useEffect } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const DAY_NAMES = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică']

const MARKET_COLORS: Record<string, string> = {
  high: '#00ff6a',    // >65%
  medium: '#fbbf24',  // 45-65%
  low: '#f87171',     // <45%
}

function getProbColor(prob: number) {
  if (prob >= 65) return MARKET_COLORS.high
  if (prob >= 45) return MARKET_COLORS.medium
  return MARKET_COLORS.low
}

function MarketSection({ market }: { market: any }) {
  const [expanded, setExpanded] = useState(false)
  const preview = market.markets.slice(0, 3)
  const rest = market.markets.slice(3)

  return (
    <div className="bg-[#071309] rounded-lg border border-[#1a3d22] overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1a3d22]">
        <span className="text-base">{market.icon}</span>
        <span className="text-xs font-display font-700 uppercase tracking-wider text-white">
          {market.label}
        </span>
      </div>
      <div className="p-2 space-y-1">
        {preview.map((m: any, i: number) => (
          <MarketRow key={i} market={m} />
        ))}
        {rest.length > 0 && (
          <>
            {expanded && rest.map((m: any, i: number) => (
              <MarketRow key={i + 3} market={m} />
            ))}
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full text-[10px] font-mono text-[#4a6b50] hover:text-[#00ff6a] py-1 transition-colors"
            >
              {expanded ? '▲ Mai puțin' : `▼ +${rest.length} mai mult`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function MarketRow({ market }: { market: any }) {
  const isInfo = market.odds === null
  const color = isInfo ? '#4a6b50' : getProbColor(market.probability)

  return (
    <div className="flex items-center justify-between gap-2 px-1 py-0.5">
      <span className="text-[11px] font-mono text-[#8a9b8f] flex-1 truncate">
        {market.name}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-16 h-1.5 bg-[#1a3d22] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(market.probability, 100)}%`,
              backgroundColor: color
            }}
          />
        </div>
        <span className="text-[11px] font-mono font-700 w-10 text-right" style={{ color }}>
          {isInfo ? `~${market.probability}` : `${market.probability}%`}
        </span>
        {market.odds && (
          <span className="text-[10px] font-mono text-[#1a3d22] w-8 text-right">
            {market.odds}
          </span>
        )}
      </div>
    </div>
  )
}

function MatchCard({ match }: { match: any }) {
  const [expanded, setExpanded] = useState(false)
  const markets = match.markets

  const homeWin = markets?.match_result?.markets?.[0]?.probability ?? 0
  const draw = markets?.match_result?.markets?.[1]?.probability ?? 0
  const awayWin = markets?.match_result?.markets?.[2]?.probability ?? 0

  const allMarketSections = markets ? [
    markets.match_result,
    markets.double_chance,
    markets.over_under,
    markets.btts,
    markets.halftime_goal,
    markets.halftime_over_under,
    markets.halftime_result,
    markets.exact_score,
    markets.combo,
    markets.corners,
    markets.cards,
  ].filter(Boolean) : []

  return (
    <div className="ticket-card mb-3 overflow-hidden">
      {/* Match header */}
      <button
        className="w-full p-4 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono text-[#4a6b50] uppercase tracking-widest">
            {match.league?.flag} {match.league?.name}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-[#1a3d22]">{match.date}</span>
            <span className="text-[#1a3d22] text-xs">{expanded ? '▲' : '▼'}</span>
          </div>
        </div>

        {/* Teams + probs */}
        <div className="flex items-center gap-3">
          <div className="flex-1 text-right">
            <p className="font-display font-700 text-sm uppercase tracking-wide leading-tight">
              {match.home}
            </p>
            <p className="text-xs font-mono text-[#00ff6a]">{homeWin}%</p>
          </div>

          <div className="text-center px-2">
            <div className="text-[10px] font-mono text-[#4a6b50]">vs</div>
            <div className="text-[10px] font-mono text-[#1a3d22] mt-0.5">X {draw}%</div>
          </div>

          <div className="flex-1 text-left">
            <p className="font-display font-700 text-sm uppercase tracking-wide leading-tight">
              {match.away}
            </p>
            <p className="text-xs font-mono text-[#4a6b50]">{awayWin}%</p>
          </div>
        </div>

        {/* Probability bar */}
        <div className="flex rounded-full overflow-hidden h-1.5 mt-3">
          <div className="bg-[#00ff6a]" style={{ width: `${homeWin}%` }} />
          <div className="bg-[#1e3a5f]" style={{ width: `${draw}%` }} />
          <div className="bg-[#3b1010]" style={{ width: `${awayWin}%` }} />
        </div>

        {/* Quick stats */}
        <div className="flex gap-3 mt-2 text-[10px] font-mono text-[#4a6b50]">
          <span>xG {markets?.expected_goals?.home ?? '?'} : {markets?.expected_goals?.away ?? '?'}</span>
          <span>•</span>
          <span>Elo {match.home_elo} / {match.away_elo}</span>
          {markets?.corners && (
            <>
              <span>•</span>
              <span>~{markets.corners.markets.find((m: any) => m.name.includes('așteptate meci'))?.probability ?? '?'} cornere</span>
            </>
          )}
        </div>
      </button>

      {/* Expanded markets */}
      {expanded && (
        <div className="border-t border-[#1a3d22] p-4">
          <p className="text-[10px] font-mono text-[#00ff6a]/40 uppercase tracking-widest mb-3">
            Toate piețele de pariuri
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {allMarketSections.map((section: any, i: number) => (
              <MarketSection key={i} market={section} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function WeeklyPage() {
  const [weekData, setWeekData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeDay, setActiveDay] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/weekly`)
      .then(r => r.json())
      .then(data => {
        setWeekData(data)
        // Selectează ziua cu cele mai multe meciuri
        const days = data.days
        const maxDay = Object.entries(days).sort(
          (a: any, b: any) => b[1].total_matches - a[1].total_matches
        )[0]?.[0] ?? DAY_NAMES[0]
        setActiveDay(maxDay)
        setLoading(false)
      })
      .catch(() => {
        setError('Nu s-a putut conecta la backend. Asigurați-vă că Render e pornit.')
        setLoading(false)
      })
  }, [])

  if (loading) return (
    <div className="min-h-screen pitch-grid flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-[#00ff6a] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-mono text-[#4a6b50] uppercase tracking-widest text-sm">
          Se calculează predicțiile...
        </p>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen pitch-grid flex items-center justify-center px-4">
      <div className="ticket-card p-6 max-w-md text-center">
        <p className="text-red-400 font-mono text-sm">{error}</p>
        <a href="/" className="mt-4 inline-block text-[#00ff6a] text-xs font-mono hover:underline">
          ← Înapoi acasă
        </a>
      </div>
    </div>
  )

  const currentDay = weekData?.days?.[activeDay]
  const matches = currentDay?.matches ?? []

  return (
    <div className="min-h-screen pitch-grid scanlines">
      {/* Header */}
      <header className="border-b border-[#1a3d22] bg-[#050f08]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-full bg-[#00ff6a] flex items-center justify-center">
                <span className="text-black text-xs">⚽</span>
              </div>
              <span className="font-display font-700 text-base tracking-widest uppercase text-white group-hover:text-[#00ff6a] transition-colors">
                FootPredict
              </span>
            </a>
            <span className="text-[#1a3d22]">/</span>
            <span className="font-display text-sm uppercase tracking-widest text-[#00ff6a]/60">
              Săptămâna
            </span>
          </div>
          <div className="text-[10px] font-mono text-[#1a3d22]">
            {weekData?.week_start} → {weekData?.week_end}
            <span className="ml-2 text-[#00ff6a]/40">{weekData?.total_matches} meciuri</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Day tabs */}
        <div className="flex gap-1 bg-[#071309] rounded-xl p-1 border border-[#1a3d22] mb-6 overflow-x-auto">
          {DAY_NAMES.map(day => {
            const dayData = weekData?.days?.[day]
            const count = dayData?.total_matches ?? 0
            return (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`flex-1 min-w-[80px] py-2 px-2 text-xs font-display font-600 uppercase tracking-wider rounded-lg transition-all ${
                  activeDay === day
                    ? 'bg-[#0d2416] text-[#00ff6a] border border-[#1a3d22]'
                    : 'text-[#4a6b50] hover:text-white'
                }`}
              >
                <div>{day}</div>
                <div className={`text-[10px] font-mono mt-0.5 ${activeDay === day ? 'text-[#00ff6a]/60' : 'text-[#1a3d22]'}`}>
                  {count} {count === 1 ? 'meci' : 'meciuri'}
                </div>
              </button>
            )
          })}
        </div>

        {/* Current day header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-800 text-2xl uppercase tracking-widest text-white">
              {activeDay}
            </h2>
            <p className="text-xs font-mono text-[#4a6b50]">
              {currentDay?.display_date} • {matches.length} {matches.length === 1 ? 'meci' : 'meciuri'} programate
            </p>
          </div>
          <div className="text-[10px] font-mono text-[#1a3d22] text-right">
            <div>Click pe meci</div>
            <div>pentru toate piețele</div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mb-4 text-[10px] font-mono">
          {[['#00ff6a', '>65% probabilitate'], ['#fbbf24', '45-65%'], ['#f87171', '<45%']].map(([color, label]) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color as string }} />
              <span className="text-[#4a6b50]">{label}</span>
            </div>
          ))}
        </div>

        {/* Matches */}
        {matches.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl opacity-20 mb-3">📅</div>
            <p className="font-mono text-[#1a3d22] uppercase tracking-widest text-sm">
              Nu sunt meciuri programate în această zi
            </p>
          </div>
        ) : (
          <div>
            {matches.map((match: any) => (
              <MatchCard key={match.fixture_id} match={match} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#0d1f10] mt-8 py-4">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-[10px] font-mono text-[#1a3d22]/40">
            Predicțiile sunt generate de modele statistice. Scop educațional — nu reprezintă sfaturi de pariuri.
          </p>
        </div>
      </footer>
    </div>
  )
}
