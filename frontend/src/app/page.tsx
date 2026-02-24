'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ─── Date helpers ─────────────────────────────────────────────────────────────
function getNextDays(n: number): string[] {
  const days = []
  for (let i = 0; i < n; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

function formatDateRO(isoDate: string): string {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-')
  return `${d}.${m}.${y}`
}

function getDayLabel(isoDate: string): string {
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const after = new Date(Date.now() + 172800000).toISOString().split('T')[0]
  if (isoDate === today) return 'Azi'
  if (isoDate === tomorrow) return 'Mâine'
  if (isoDate === after) return 'Poimâine'
  return formatDateRO(isoDate)
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface League { id: number; name: string; country: string; flag: string; confederation: string; rating: number }
interface Fixture { id: number; home: string; away: string; home_id: number; away_id: number; date: string; time?: string }
interface Prediction {
  home_team: string; away_team: string
  probabilities: { home: number; draw: number; away: number }
  poisson: { home: number; draw: number; away: number }
  elo: { home: number; draw: number; away: number }
  xgboost: { home: number; draw: number; away: number }
  top_scores: Array<{ score: string; probability: number }>
  expected_goals: { home: number; away: number }
  home_stats: any; away_stats: any
  markets?: any
}

function getProbColor(p: number) {
  if (p >= 65) return '#10b981'
  if (p >= 45) return '#f59e0b'
  return '#ef4444'
}

// ─── Market components ────────────────────────────────────────────────────────
function MarketRow({ market }: { market: any }) {
  const isInfo = market.odds === null
  const color = isInfo ? '#475569' : getProbColor(market.probability)
  return (
    <div className="market-row">
      <span className="text-xs text-gray-400 flex-1 truncate">{market.name}</span>
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-16 prob-bar">
          <div className="h-full rounded-full" style={{ width: `${Math.min(market.probability, 100)}%`, backgroundColor: color }} />
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
    <div className="bg-green-950/60 rounded-lg border border-green-900/50 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-green-900/30 border-b border-green-900/40">
        <span>{market.icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-green-200">{market.label}</span>
      </div>
      <div className="p-2 space-y-0.5">
        {preview.map((m: any, i: number) => <MarketRow key={i} market={m} />)}
        {rest.length > 0 && (
          <>
            {expanded && rest.map((m: any, i: number) => <MarketRow key={i + 4} market={m} />)}
            <button onClick={() => setExpanded(!expanded)}
              className="w-full text-[11px] font-mono text-green-600 hover:text-green-400 py-1 transition-colors">
              {expanded ? '▲ Mai puțin' : `▼ +${rest.length} opțiuni`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Fixture info banner ──────────────────────────────────────────────────────
function FixtureBanner({ fixture }: { fixture: Fixture }) {
  if (!fixture.date) return null
  const dayLabel = getDayLabel(fixture.date)
  const dateStr = formatDateRO(fixture.date)
  const timeStr = fixture.time || ''

  return (
    <div className="flex items-center gap-3 p-3 mb-4 rounded-xl bg-green-900/30 border border-green-700/40">
      <div className="text-2xl">📅</div>
      <div>
        <p className="text-xs font-mono text-green-400 uppercase tracking-widest">{dayLabel}</p>
        <p className="font-display text-lg text-white tracking-wide">
          {fixture.home} <span className="text-green-600 text-sm">vs</span> {fixture.away}
        </p>
        <p className="text-xs font-mono text-gray-400 mt-0.5">
          {dateStr}{timeStr ? ` · 🕐 ${timeStr} ora României` : ''}
        </p>
      </div>
    </div>
  )
}

// ─── Full prediction display ──────────────────────────────────────────────────
function PredictionDisplay({ prediction, fixture }: { prediction: Prediction; fixture: Fixture }) {
  const [activeTab, setActiveTab] = useState('markets')

  const prob = prediction.probabilities
  const homeProb = prob?.home ?? 0
  const drawProb = prob?.draw ?? 0
  const awayProb = prob?.away ?? 0

  const dayLabel = getDayLabel(fixture.date)
  const dateStr = formatDateRO(fixture.date)
  const timeStr = fixture.time || '—'

  const marketSections = prediction.markets ? [
    prediction.markets.match_result,
    prediction.markets.double_chance,
    prediction.markets.over_under,
    prediction.markets.btts,
    prediction.markets.halftime_goal,
    prediction.markets.halftime_over_under,
    prediction.markets.halftime_result,
    prediction.markets.exact_score,
    prediction.markets.combo,
    prediction.markets.corners,
    prediction.markets.cards,
  ].filter(Boolean) : []

  return (
    <div className="fade-in space-y-5">
      <div className="card-highlight p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="badge badge-green">⚽ Predicție finală</span>
          <div className="flex items-center gap-2">
            <span className="badge badge-gray">📅 {dayLabel} · {dateStr}</span>
            {timeStr !== '—' && (
              <span className="badge badge-amber">🕐 {timeStr} (RO)</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 text-center">
            <p className="font-display text-2xl sm:text-3xl text-white tracking-wide leading-tight">{prediction.home_team}</p>
            <p className="font-display text-4xl sm:text-5xl mt-2" style={{ color: getProbColor(homeProb) }}>{homeProb}%</p>
            <p className="text-xs text-gray-500 mt-1 font-mono uppercase">Victorie</p>
          </div>
          <div className="text-center px-2">
            <div className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-1">Egal</div>
            <div className="font-display text-3xl text-gray-300">{drawProb}%</div>
            <div className="text-[10px] font-mono text-gray-600 mt-1">
              xG {prediction.expected_goals?.home} : {prediction.expected_goals?.away}
            </div>
          </div>
          <div className="flex-1 text-center">
            <p className="font-display text-2xl sm:text-3xl text-white tracking-wide leading-tight">{prediction.away_team}</p>
            <p className="font-display text-4xl sm:text-5xl mt-2" style={{ color: getProbColor(awayProb) }}>{awayProb}%</p>
            <p className="text-xs text-gray-500 mt-1 font-mono uppercase">Victorie</p>
          </div>
        </div>

        <div className="score-bar mt-5">
          <div className="prob-fill-blue rounded-l-full" style={{ flex: homeProb }} />
          <div className="prob-fill-draw" style={{ flex: drawProb }} />
          <div className="prob-fill-red rounded-r-full" style={{ flex: awayProb }} />
        </div>
        <div className="flex justify-between text-[11px] font-mono text-gray-600 mt-1">
          <span>{prediction.home_team}</span>
          <span>Egal</span>
          <span>{prediction.away_team}</span>
        </div>
      </div>

      <div className="tab-bar">
        {[
          { key: 'markets', label: '📊 Pariuri' },
          { key: 'scores',  label: '🎯 Scoruri exacte' },
          { key: 'models',  label: '🤖 Modele' },
          { key: 'stats',   label: '📈 Statistici' },
        ].map(t => (
          <button key={t.key} className={`tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'markets' && (
        <div className="fade-in">
          {marketSections.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {marketSections.map((s: any, i: number) => <MarketSection key={i} market={s} />)}
            </div>
          ) : (
            <div className="card p-6 text-center">
              <p className="text-gray-500 font-mono text-sm">Piețele de pariuri nu sunt disponibile pentru acest meci</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'scores' && (
        <div className="card p-5 fade-in">
          <h3 className="font-display text-lg text-white tracking-wide mb-4">Top 10 Scoruri Exacte</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {prediction.top_scores?.slice(0, 10).map((s, i) => (
              <div key={i} className="card-highlight p-3 text-center">
                <div className="font-display text-2xl text-white">{s.score}</div>
                <div className="text-xs font-mono mt-1" style={{ color: getProbColor(s.probability) }}>{s.probability}%</div>
                <div className="text-[10px] font-mono text-gray-600 mt-0.5">#{i + 1}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'models' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 fade-in">
          {[
            { label: 'XGBoost', icon: '🤖', weight: '40%', data: prediction.xgboost, color: '#4ade80' },
            { label: 'Poisson', icon: '📐', weight: '40%', data: prediction.poisson,  color: '#a78bfa' },
            { label: 'Elo',     icon: '♟',  weight: '20%', data: prediction.elo,      color: '#34d399' },
          ].map(model => (
            <div key={model.label} className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{model.icon}</span>
                  <span className="font-display text-lg text-white tracking-wide">{model.label}</span>
                </div>
                <span className="badge badge-green">{model.weight}</span>
              </div>
              {model.data && ['home', 'draw', 'away'].map((k, i) => {
                const labels = ['1 (Gazdă)', 'X (Egal)', '2 (Oaspete)']
                const val = (model.data as any)[k]
                return (
                  <div key={k} className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">{labels[i]}</span>
                      <span className="font-semibold" style={{ color: model.color }}>{val}%</span>
                    </div>
                    <div className="prob-bar">
                      <div className="h-full rounded-full" style={{ width: `${val}%`, background: model.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 fade-in">
          {[prediction.home_team, prediction.away_team].map((team, ti) => {
            const stats = ti === 0 ? prediction.home_stats : prediction.away_stats
            if (!stats) return null
            return (
              <div key={team} className="card p-5">
                <h3 className="font-display text-lg text-white tracking-wide mb-4">{team}</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { label: 'Elo', value: stats.elo_rating },
                    { label: 'xG For', value: stats.xg_for },
                    { label: 'xG Against', value: stats.xg_against },
                    { label: 'Goals/game', value: stats.goals_avg },
                  ].map(s => (
                    <div key={s.label} className="stat-card">
                      <div className="stat-value">{s.value}</div>
                      <div className="stat-label">{s.label}</div>
                    </div>
                  ))}
                </div>
                {stats.form && (
                  <div className="flex gap-1 flex-wrap">
                    {stats.form.map((r: string, i: number) => (
                      <span key={i} className={`badge ${r === 'W' ? 'badge-green' : r === 'D' ? 'badge-gray' : 'badge-red'}`}>{r}</span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Home() {
  const [leagues, setLeagues] = useState<League[]>([])
  const [selectedLeague, setSelectedLeague] = useState<number | null>(null)
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingFixtures, setLoadingFixtures] = useState(false)

  // Date dinamice: azi, mâine, poimâine
  const nextDays = getNextDays(3)

  useEffect(() => {
    axios.get(`${API_BASE}/api/leagues`).then(r => setLeagues(r.data.leagues || []))
  }, [])

  useEffect(() => {
    if (!selectedLeague) return
    setFixtures([]); setSelectedFixture(null); setPrediction(null)
    setLoadingFixtures(true)
    axios.get(`${API_BASE}/api/fixtures/${selectedLeague}`)
      .then(r => {
        const all: Fixture[] = r.data.fixtures || []
        // Meciurile din azi + mâine + poimâine
        const filtered = all.filter(f => f.date && nextDays.includes(f.date))
        // Dacă nu există meciuri în intervalul de 3 zile, arată toate
        setFixtures(filtered.length > 0 ? filtered : all)
      })
      .finally(() => setLoadingFixtures(false))
  }, [selectedLeague])

  const predict = async () => {
    if (!selectedFixture) return
    setLoading(true); setPrediction(null)
    try {
      const r = await axios.get(`${API_BASE}/api/predict`, {
        params: {
          home_team: selectedFixture.home,
          away_team: selectedFixture.away,
          league_id: selectedLeague || 39,
          home_team_id: selectedFixture.home_id,
          away_team_id: selectedFixture.away_id,
        }
      })
      setPrediction(r.data)
    } catch { } finally { setLoading(false) }
  }

  const confGroups = ['UEFA', 'CONMEBOL', 'CONCACAF', 'AFC', 'CAF', 'OFC']
  const grouped = confGroups.reduce((acc, c) => {
    acc[c] = leagues.filter(l => l.confederation === c)
    return acc
  }, {} as Record<string, League[]>)

  // Grupează fixture-urile pe zile (doar azi/mâine/poimâine)
  const fixturesByDay = nextDays.reduce((acc, day) => {
    const dayFixtures = fixtures.filter(f => f.date === day)
    if (dayFixtures.length > 0) acc[day] = dayFixtures
    return acc
  }, {} as Record<string, Fixture[]>)

  const hasDatedFixtures = Object.keys(fixturesByDay).length > 0
  const fixturesWithoutDate = fixtures.filter(f => !f.date || !nextDays.includes(f.date))

  return (
    <div className="app-bg grid-bg min-h-screen">
      {/* Header */}
      <header className="header">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center text-sm">⚽</div>
            <span className="font-display text-xl text-white tracking-widest">FOOTPREDICT</span>
            <div className="pulse-dot ml-2 hidden sm:block" />
          </div>
          {/* ① "Săptămâna" redenumit în "Rezultate" */}
          <nav className="flex items-center gap-1">
            <a href="/" className="nav-link active">Predicții</a>
            <a href="/weekly" className="nav-link">Rezultate</a>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-10 fade-in">
          <h1 className="font-display text-5xl sm:text-6xl text-white tracking-widest mb-3">
            PREDICȚII FOTBAL
          </h1>
          <p className="text-green-400 text-sm font-mono uppercase tracking-widest">
            xG · Elo · XGBoost · Poisson — 100 Ligi
          </p>
        </div>

        {/* Selector card */}
        <div className="card p-6 mb-6 fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Liga */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Ligă / Competiție
              </label>
              <select
                className="select-styled"
                value={selectedLeague || ''}
                onChange={e => setSelectedLeague(Number(e.target.value))}
              >
                <option value="">Selectează liga...</option>
                {confGroups.map(conf => (
                  grouped[conf]?.length > 0 && (
                    <optgroup key={conf} label={`── ${conf} ──`}>
                      {grouped[conf].map(l => (
                        <option key={l.id} value={l.id}>
                          {l.flag} {l.name} — {l.country}
                        </option>
                      ))}
                    </optgroup>
                  )
                ))}
              </select>
            </div>

            {/* ② Meci — grupat pe zile cu dată și oră deasupra fiecărui meci */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Meci {fixtures.length > 0 && (
                  <span className="text-green-500 ml-1">({fixtures.length} disponibile)</span>
                )}
              </label>
              {loadingFixtures ? (
                <div className="select-styled flex items-center gap-2 text-gray-500">
                  <div className="w-3 h-3 border border-green-500 border-t-transparent rounded-full animate-spin" />
                  Se încarcă meciurile...
                </div>
              ) : (
                <select
                  className="select-styled"
                  value={selectedFixture?.id || ''}
                  onChange={e => {
                    const f = fixtures.find(x => x.id === Number(e.target.value))
                    setSelectedFixture(f || null); setPrediction(null)
                  }}
                  disabled={fixtures.length === 0}
                >
                  <option value="">
                    {fixtures.length === 0 ? 'Selectează liga mai întâi...' : 'Selectează meciul...'}
                  </option>

                  {/* Grupate pe zile cu label: Azi · 22.02.2026 */}
                  {hasDatedFixtures ? (
                    nextDays.map(day => (
                      fixturesByDay[day]?.length > 0 && (
                        <optgroup key={day} label={`📅 ${getDayLabel(day)} · ${formatDateRO(day)}`}>
                          {fixturesByDay[day].map(f => (
                            <option key={f.id} value={f.id}>
                              {f.time ? `🕐 ${f.time}  ` : ''}{f.home} vs {f.away}
                            </option>
                          ))}
                        </optgroup>
                      )
                    ))
                  ) : (
                    fixtures.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.home} vs {f.away}
                      </option>
                    ))
                  )}

                  {hasDatedFixtures && fixturesWithoutDate.length > 0 && (
                    <optgroup label="── Alte meciuri ──">
                      {fixturesWithoutDate.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.home} vs {f.away}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              )}
            </div>

            {/* ③ Buton redenumit din "Prezice" în "Predicție" */}
            <div className="flex flex-col justify-end">
              <button
                className="btn-accent w-full"
                onClick={predict}
                disabled={!selectedFixture || loading}
              >
                {loading ? '⏳ Se calculează...' : '🔮 Predicție'}
              </button>
              {selectedFixture && (
                <p className="text-[11px] font-mono text-gray-500 mt-2 text-center">
                  {getDayLabel(selectedFixture.date)} · {formatDateRO(selectedFixture.date)}
                  {selectedFixture.time && ` · 🕐 ${selectedFixture.time} (RO)`}
                </p>
              )}
            </div>
          </div>

          {/* ② Banner cu data și ora meciului selectat */}
          {selectedFixture && (
            <div className="mt-4">
              <FixtureBanner fixture={selectedFixture} />
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16 fade-in">
            <div className="text-center">
              <div className="spinner mx-auto mb-4" />
              <p className="text-green-300 text-sm font-mono uppercase tracking-widest">
                Calculez predicțiile pentru {selectedFixture?.home} vs {selectedFixture?.away}...
              </p>
            </div>
          </div>
        )}

        {/* Prediction result */}
        {prediction && !loading && selectedFixture && (
          <PredictionDisplay prediction={prediction} fixture={selectedFixture} />
        )}

        {/* Empty state */}
        {!prediction && !loading && (
          <div className="text-center py-20 fade-in">
            <div className="text-6xl opacity-10 mb-4">⚽</div>
            <p className="font-display text-2xl text-gray-600 tracking-widest mb-2">SELECTEAZĂ O LIGĂ ȘI UN MECI</p>
            <p className="text-gray-700 text-sm font-mono">
              Meciurile din azi, mâine și poimâine vor apărea automat
            </p>
          </div>
        )}
      </main>

      <footer className="border-t border-green-900/40 mt-12 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-xs font-mono text-gray-700">
            FootPredict — Scop educațional. Nu reprezintă sfaturi de pariuri.
          </p>
        </div>
      </footer>
    </div>
  )
}
