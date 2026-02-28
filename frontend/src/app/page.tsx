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
interface StandingRow {
  position: number; team: string; team_id: number; played: number
  won: number; draw: number; lost: number
  goals_for: number; goals_against: number; goal_diff: number; points: number; form: string
}
interface Prediction {
  home_team: string; away_team: string
  prediction: { home_win: number; draw: number; away_win: number; method: string }
  top_scores: Array<{ score: string; probability: number }>
  expected_goals: { home: number; away: number }
  home_stats: any; away_stats: any
  markets?: any
  model_breakdown?: any
}

function getProbColor(p: number) {
  if (p >= 60) return '#10b981'
  if (p >= 40) return '#f59e0b'
  return '#ef4444'
}

// ─── Form Badge ───────────────────────────────────────────────────────────────
function FormBadge({ result }: { result: string }) {
  const cfg: Record<string, string> = {
    W: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    D: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
    L: 'bg-red-500/20 text-red-400 border border-red-500/30',
  }
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold font-mono ${cfg[result] || cfg.D}`}>
      {result}
    </span>
  )
}

// ─── Stat Bar ─────────────────────────────────────────────────────────────────
function StatBar({ label, homeVal, awayVal, format = (v: number) => v.toFixed(2) }: {
  label: string; homeVal: number; awayVal: number; format?: (v: number) => string
}) {
  const total = homeVal + awayVal || 1
  const homeW = Math.round((homeVal / total) * 100)
  const awayW = 100 - homeW
  const homeBetter = homeVal >= awayVal
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs font-mono mb-1">
        <span className={homeBetter ? 'text-blue-300 font-bold' : 'text-gray-400'}>{format(homeVal)}</span>
        <span className="text-gray-500 uppercase tracking-widest text-[10px]">{label}</span>
        <span className={!homeBetter ? 'text-blue-300 font-bold' : 'text-gray-400'}>{format(awayVal)}</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-800">
        <div className="h-full rounded-l-full transition-all" style={{ width: `${homeW}%`, background: 'linear-gradient(90deg, #3b82f6, #60a5fa)' }} />
        <div className="h-full rounded-r-full transition-all" style={{ width: `${awayW}%`, background: 'linear-gradient(90deg, #f97316, #fb923c)' }} />
      </div>
    </div>
  )
}

// ─── Probability Bar ──────────────────────────────────────────────────────────
function ProbBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <div className="relative h-24 flex items-end justify-center mb-2">
        <div
          className="w-12 rounded-t-lg transition-all duration-700"
          style={{ height: `${Math.max(value, 5)}%`, backgroundColor: color, opacity: 0.9 }}
        />
      </div>
      <div className="text-xl font-bold font-mono" style={{ color }}>{value}%</div>
      <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">{label}</div>
    </div>
  )
}

// ─── Market Row ───────────────────────────────────────────────────────────────
function MarketRow({ market }: { market: any }) {
  const color = getProbColor(market.probability)
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-800/50 last:border-0">
      <span className="text-xs text-gray-400 flex-1 truncate">{market.name}</span>
      <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(market.probability, 100)}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold font-mono w-10 text-right" style={{ color }}>{market.probability}%</span>
      {market.odds && <span className="text-[10px] text-gray-600 w-8 text-right font-mono">{market.odds}</span>}
    </div>
  )
}

// ─── Market Section ───────────────────────────────────────────────────────────
function MarketSection({ market }: { market: any }) {
  const items = market.items || market.markets || []
  if (!items.length) return null
  return (
    <div className="mb-5">
      <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-2">
        <div className="h-px flex-1 bg-blue-900/40" />
        <span>{market.icon || '📊'} {market.category || market.label}</span>
        <div className="h-px flex-1 bg-blue-900/40" />
      </div>
      {items.map((m: any, i: number) => <MarketRow key={i} market={m} />)}
    </div>
  )
}

// ─── Standings Table ──────────────────────────────────────────────────────────
function StandingsTable({ standings, highlightTeams }: { standings: StandingRow[]; highlightTeams: string[] }) {
  if (!standings.length) return (
    <div className="text-center py-8 text-gray-600 text-sm">
      Clasamentul nu e disponibil pentru această ligă
    </div>
  )
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="text-gray-600 uppercase tracking-widest border-b border-gray-800">
            <th className="text-left pb-2 w-6">#</th>
            <th className="text-left pb-2">Echipă</th>
            <th className="text-center pb-2 w-8">J</th>
            <th className="text-center pb-2 w-8">V</th>
            <th className="text-center pb-2 w-8">E</th>
            <th className="text-center pb-2 w-8">Î</th>
            <th className="text-center pb-2 w-12">GD</th>
            <th className="text-center pb-2 w-8 font-bold text-blue-500">Pct</th>
            <th className="text-center pb-2 w-20 hidden sm:table-cell">Formă</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row) => {
            const isHighlighted = highlightTeams.some(t =>
              row.team.toLowerCase().includes(t.toLowerCase().slice(0, 5)) ||
              t.toLowerCase().includes(row.team.toLowerCase().slice(0, 5))
            )
            return (
              <tr
                key={row.position}
                className={`border-b border-gray-800/30 transition-colors ${isHighlighted ? 'bg-blue-900/20 text-white' : 'text-gray-400 hover:bg-gray-800/20'}`}
              >
                <td className="py-1.5 text-gray-600">{row.position}</td>
                <td className="py-1.5 font-semibold truncate max-w-[120px]">
                  {isHighlighted && <span className="text-blue-400 mr-1">›</span>}
                  {row.team}
                </td>
                <td className="py-1.5 text-center">{row.played}</td>
                <td className="py-1.5 text-center text-emerald-500">{row.won}</td>
                <td className="py-1.5 text-center text-gray-500">{row.draw}</td>
                <td className="py-1.5 text-center text-red-500">{row.lost}</td>
                <td className={`py-1.5 text-center ${row.goal_diff > 0 ? 'text-emerald-400' : row.goal_diff < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                  {row.goal_diff > 0 ? '+' : ''}{row.goal_diff}
                </td>
                <td className="py-1.5 text-center font-bold text-white">{row.points}</td>
                <td className="py-1.5 hidden sm:table-cell">
                  <div className="flex gap-0.5 justify-center">
                    {row.form?.split('').slice(-5).map((r: string, i: number) => (
                      <div key={i} className={`w-3 h-3 rounded-sm text-[8px] flex items-center justify-center font-bold
                        ${r==='W'?'bg-emerald-600':r==='D'?'bg-gray-600':'bg-red-600'}`}>{r}</div>
                    ))}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Team Stats Card ──────────────────────────────────────────────────────────
function TeamStatsCard({ stats, teamName, color }: { stats: any; teamName: string; color: string }) {
  if (!stats) return null
  const form = stats.form || []
  const xgFor = stats.xg_for_history || stats.xg_for || []
  const xgAg = stats.xg_against_history || stats.xg_against || []
  const avgXgFor = Array.isArray(xgFor) ? xgFor.reduce((a: number, b: number) => a + b, 0) / (xgFor.length || 1) : xgFor
  const avgXgAg = Array.isArray(xgAg) ? xgAg.reduce((a: number, b: number) => a + b, 0) / (xgAg.length || 1) : xgAg
  const wins = form.filter((r: string) => r === 'W').length
  const draws = form.filter((r: string) => r === 'D').length

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-6 rounded-full" style={{ backgroundColor: color }} />
        <h3 className="font-display text-base text-white tracking-wide truncate">{teamName}</h3>
      </div>

      {/* Formă */}
      {form.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">Ultimele meciuri</div>
          <div className="flex gap-1">
            {form.map((r: string, i: number) => <FormBadge key={i} result={r} />)}
          </div>
          <div className="text-xs text-gray-500 mt-2 font-mono">
            {wins}V · {draws}E · {form.length - wins - draws}Î
            <span className="ml-2 text-blue-400">
              {Math.round((wins / (form.length || 1)) * 100)}% win rate
            </span>
          </div>
        </div>
      )}

      {/* Statistici */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          { label: 'xG For', value: avgXgFor.toFixed(2), icon: '⚽' },
          { label: 'xG Against', value: avgXgAg.toFixed(2), icon: '🛡️' },
          { label: 'Goluri/meci', value: stats.goals_avg?.toFixed(2) || avgXgFor.toFixed(2), icon: '📊' },
          { label: 'Elo Rating', value: stats.elo_rating || '—', icon: '📈' },
        ].map(s => (
          <div key={s.label} className="bg-gray-800/40 rounded-lg p-2.5">
            <div className="text-[10px] text-gray-600 uppercase tracking-widest">{s.icon} {s.label}</div>
            <div className="text-lg font-bold font-mono text-white mt-0.5">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Mini xG chart */}
      {Array.isArray(xgFor) && xgFor.length > 0 && (
        <div>
          <div className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">xG ultimele meciuri</div>
          <div className="flex items-end gap-1 h-10">
            {xgFor.slice(-5).map((v: number, i: number) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full rounded-t-sm" style={{ height: `${Math.min(v * 25, 40)}px`, backgroundColor: color, opacity: 0.7 }} />
              </div>
            ))}
          </div>
          <div className="text-[9px] text-gray-700 text-center mt-1 font-mono">meciuri recente →</div>
        </div>
      )}
    </div>
  )
}

// ─── Prediction Display ────────────────────────────────────────────────────────
function PredictionDisplay({ prediction, fixture, standings }: { prediction: Prediction; fixture: Fixture; standings: StandingRow[] }) {
  const [activeTab, setActiveTab] = useState('markets')
  const pred = prediction.prediction || {}
  const home_w = pred.home_win ?? 0
  const draw   = pred.draw ?? 0
  const away_w = pred.away_win ?? 0

  const tabs = [
    { key: 'markets',   label: '🎯 Pariuri' },
    { key: 'scores',    label: '⚽ Scoruri' },
    { key: 'stats',     label: '📊 Statistici' },
    { key: 'standings', label: '🏆 Clasament' },
    { key: 'models',    label: '🤖 Modele' },
  ]

  const breakdown = prediction.model_breakdown || {}

  return (
    <div className="fade-in">
      {/* Header meci */}
      <div className="card p-6 mb-4">
        <div className="text-center mb-6">
          <div className="text-xs font-mono text-gray-600 uppercase tracking-widest mb-3">
            {getDayLabel(fixture.date)} · {formatDateRO(fixture.date)}{fixture.time ? ` · 🕐 ${fixture.time}` : ''}
          </div>
          <div className="flex items-center justify-center gap-4 md:gap-8">
            <div className="text-right flex-1">
              <div className="font-display text-lg md:text-2xl text-white tracking-wide">{prediction.home_team}</div>
              <div className="text-xs text-gray-600 font-mono mt-1">GAZDĂ</div>
            </div>
            <div className="shrink-0 px-3 py-1.5 rounded-lg bg-gray-800/60 border border-gray-700">
              <span className="font-mono text-gray-500 text-sm">VS</span>
            </div>
            <div className="text-left flex-1">
              <div className="font-display text-lg md:text-2xl text-white tracking-wide">{prediction.away_team}</div>
              <div className="text-xs text-gray-600 font-mono mt-1">OASPETE</div>
            </div>
          </div>
        </div>

        {/* Bare probabilitate principale */}
        <div className="flex justify-around items-end mt-4">
          <ProbBar label={prediction.home_team.split(' ')[0]} value={home_w} color="#3b82f6" />
          <ProbBar label="Egal" value={draw} color="#6b7280" />
          <ProbBar label={prediction.away_team.split(' ')[0]} value={away_w} color="#f97316" />
        </div>

        <div className="mt-4 text-center text-xs font-mono text-gray-700">
          {pred.method || 'XGBoost + Poisson + Elo'}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto scrollbar-hide">
        {tabs.map(t => (
          <button key={t.key}
            className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all
              ${activeTab === t.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800/60 text-gray-500 hover:text-gray-300 border border-gray-700/50'
              }`}
            onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Pariuri */}
      {activeTab === 'markets' && (
        <div className="card p-5 fade-in">
          {(prediction.markets && prediction.markets.length > 0)
            ? prediction.markets.map((m: any, i: number) => <MarketSection key={i} market={m} />)
            : (
              <div>
                <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3 text-center">
                  📊 Rezultat meci
                </div>
                <div className="space-y-1">
                  {[
                    { name: `1 — Victorie ${prediction.home_team}`, probability: home_w, odds: (100/Math.max(home_w,1)).toFixed(2) },
                    { name: 'X — Egal', probability: draw, odds: (100/Math.max(draw,1)).toFixed(2) },
                    { name: `2 — Victorie ${prediction.away_team}`, probability: away_w, odds: (100/Math.max(away_w,1)).toFixed(2) },
                  ].map((m, i) => <MarketRow key={i} market={m} />)}
                </div>
              </div>
            )
          }
        </div>
      )}

      {/* Tab: Scoruri */}
      {activeTab === 'scores' && (
        <div className="card p-5 fade-in">
          <div className="flex gap-4 mb-4 text-center">
            {[
              { label: 'xG Gazdă', value: prediction.expected_goals?.home?.toFixed(2) ?? '—', color: '#3b82f6' },
              { label: 'xG Oaspete', value: prediction.expected_goals?.away?.toFixed(2) ?? '—', color: '#f97316' },
            ].map(s => (
              <div key={s.label} className="flex-1 bg-gray-800/40 rounded-xl p-4">
                <div className="text-3xl font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs text-gray-600 uppercase tracking-widest mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3 text-center">
            Cele mai probabile scoruri
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(prediction.top_scores || []).slice(0, 8).map((s: any, i: number) => (
              <div key={i} className="flex justify-between items-center bg-gray-800/30 rounded-lg px-3 py-2">
                <span className="font-display text-lg text-white tracking-widest">{s.score}</span>
                <span className="text-xs font-mono text-blue-400">{s.probability}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Statistici */}
      {activeTab === 'stats' && (
        <div className="fade-in space-y-4">
          {/* Comparație */}
          {prediction.home_stats && prediction.away_stats && (
            <div className="card p-5">
              <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-4 text-center">
                Comparație directă
              </div>
              <div className="flex justify-between text-xs font-mono text-gray-500 mb-3">
                <span className="text-blue-400 font-bold">{prediction.home_team.split(' ').slice(-1)[0]}</span>
                <span></span>
                <span className="text-orange-400 font-bold">{prediction.away_team.split(' ').slice(-1)[0]}</span>
              </div>
              <StatBar
                label="xG For"
                homeVal={prediction.home_stats.xg_for ?? 1.5}
                awayVal={prediction.away_stats.xg_for ?? 1.2}
              />
              <StatBar
                label="xG Against"
                homeVal={prediction.home_stats.xg_against ?? 1.2}
                awayVal={prediction.away_stats.xg_against ?? 1.5}
              />
              <StatBar
                label="Goluri/meci"
                homeVal={prediction.home_stats.goals_avg ?? 1.5}
                awayVal={prediction.away_stats.goals_avg ?? 1.2}
              />
              <StatBar
                label="Elo Rating"
                homeVal={prediction.home_stats.elo_rating ?? 1500}
                awayVal={prediction.away_stats.elo_rating ?? 1500}
                format={(v) => Math.round(v).toString()}
              />
            </div>
          )}
          {/* Carduri individuale */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TeamStatsCard stats={prediction.home_stats} teamName={prediction.home_team} color="#3b82f6" />
            <TeamStatsCard stats={prediction.away_stats} teamName={prediction.away_team} color="#f97316" />
          </div>
        </div>
      )}

      {/* Tab: Clasament */}
      {activeTab === 'standings' && (
        <div className="card p-5 fade-in">
          <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-4 text-center">
            Clasament · Sezon curent
          </div>
          <StandingsTable
            standings={standings}
            highlightTeams={[prediction.home_team, prediction.away_team]}
          />
          {standings.length === 0 && (
            <p className="text-center text-xs text-gray-600 mt-2">
              Clasamentul e disponibil pentru: Premier League, La Liga, Bundesliga, Serie A, Ligue 1, Eredivisie, Primeira Liga, Brasileirao
            </p>
          )}
        </div>
      )}

      {/* Tab: Modele */}
      {activeTab === 'models' && (
        <div className="card p-5 fade-in">
          <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-4 text-center">
            Detalii modele predicție
          </div>
          <div className="space-y-4">
            {[
              { key: 'elo',     label: '⚡ Elo Rating', color: '#a78bfa', weight: '15-20%' },
              { key: 'poisson', label: '📐 Poisson xG',  color: '#34d399', weight: '35-40%' },
              { key: 'xgboost', label: '🤖 XGBoost',     color: '#60a5fa', weight: '40-50%' },
            ].map(({ key, label, color, weight }) => {
              const data = breakdown[key]
              if (!data) return null
              return (
                <div key={key} className="bg-gray-800/30 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-bold" style={{ color }}>{label}</span>
                    <span className="text-[10px] text-gray-600 font-mono">Pondere: {weight}</span>
                  </div>
                  <div className="flex justify-around">
                    {[
                      { l: '1', v: data.home_win ?? data.home },
                      { l: 'X', v: data.draw },
                      { l: '2', v: data.away_win ?? data.away },
                    ].map(({ l, v }) => (
                      <div key={l} className="text-center">
                        <div className="text-lg font-bold font-mono" style={{ color }}>{v ?? '—'}%</div>
                        <div className="text-[10px] text-gray-600 uppercase">{l}</div>
                      </div>
                    ))}
                  </div>
                  {key === 'elo' && breakdown.elo && (
                    <div className="mt-2 text-xs text-gray-600 font-mono text-center">
                      Elo: {prediction.home_team.split(' ').slice(-1)[0]} {breakdown.elo.home_rating} vs {breakdown.elo.away_rating} {prediction.away_team.split(' ').slice(-1)[0]}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
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
  const [standings, setStandings] = useState<StandingRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingFixtures, setLoadingFixtures] = useState(false)

  const nextDays = getNextDays(3)

  useEffect(() => {
    axios.get(`${API_BASE}/api/leagues`).then(r => setLeagues(r.data.leagues || []))
  }, [])

  useEffect(() => {
    if (!selectedLeague) return
    setFixtures([]); setSelectedFixture(null); setPrediction(null); setStandings([])
    setLoadingFixtures(true)

    // Fetch meciuri + clasament în paralel
    Promise.all([
      axios.get(`${API_BASE}/api/fixtures/${selectedLeague}`),
      axios.get(`${API_BASE}/api/standings/${selectedLeague}`).catch(() => ({ data: { standings: [] } })),
    ]).then(([fixtRes, standRes]) => {
      const all: Fixture[] = fixtRes.data.fixtures || []
      const filtered = all.filter(f => !f.date || nextDays.includes(f.date))
      setFixtures(filtered.length > 0 ? filtered : all)
      setStandings(standRes.data.standings || [])
    }).finally(() => setLoadingFixtures(false))
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
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm">⚽</div>
            <span className="font-display text-xl text-white tracking-widest">FOOTPREDICT</span>
            <div className="pulse-dot ml-2 hidden sm:block" />
          </div>
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
          <p className="text-blue-300 text-sm font-mono uppercase tracking-widest">
            xG · Elo · XGBoost · Poisson · Clasament Live — 100 Ligi
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

            {/* Meci */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Meci {fixtures.length > 0 && <span className="text-blue-500 ml-1">({fixtures.length} disponibile)</span>}
              </label>
              {loadingFixtures ? (
                <div className="select-styled flex items-center gap-2 text-gray-500">
                  <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin" />
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
                  {hasDatedFixtures ? (
                    nextDays.map(day => (
                      fixturesByDay[day]?.length > 0 && (
                        <optgroup key={day} label={`── ${getDayLabel(day)} · ${formatDateRO(day)} ──`}>
                          {fixturesByDay[day].map(f => (
                            <option key={f.id} value={f.id}>
                              {f.home} vs {f.away}{f.time ? ` · ${f.time}` : ''}
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

            {/* Predicție */}
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
                  {selectedFixture.time && ` · 🕐 ${selectedFixture.time}`}
                </p>
              )}
            </div>
          </div>

          {/* Standings preview când e ligă selectată dar nu e meci */}
          {standings.length > 0 && !prediction && !loading && (
            <div className="mt-5 pt-5 border-t border-gray-800">
              <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3 text-center">
                🏆 Clasament · Selectează un meci pentru predicție
              </div>
              <StandingsTable standings={standings.slice(0, 6)} highlightTeams={[]} />
              {standings.length > 6 && (
                <div className="text-center mt-2 text-xs text-gray-700">... și încă {standings.length - 6} echipe</div>
              )}
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16 fade-in">
            <div className="text-center">
              <div className="spinner mx-auto mb-4" />
              <p className="text-blue-300 text-sm font-mono uppercase tracking-widest">
                Calculez predicțiile pentru {selectedFixture?.home} vs {selectedFixture?.away}...
              </p>
            </div>
          </div>
        )}

        {/* Prediction result */}
        {prediction && !loading && selectedFixture && (
          <PredictionDisplay prediction={prediction} fixture={selectedFixture} standings={standings} />
        )}

        {/* Empty state */}
        {!prediction && !loading && !selectedLeague && (
          <div className="text-center py-20 fade-in">
            <div className="text-6xl opacity-10 mb-4">⚽</div>
            <p className="font-display text-2xl text-gray-600 tracking-widest mb-2">SELECTEAZĂ O LIGĂ ȘI UN MECI</p>
            <p className="text-gray-700 text-sm font-mono">
              Meciurile din următoarele 3 zile · Clasament live · Statistici detaliate
            </p>
          </div>
        )}
      </main>

      <footer className="border-t border-blue-900/40 mt-12 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-xs font-mono text-gray-700">
            FootPredict — Scop educațional. Nu reprezintă sfaturi de pariuri.
          </p>
        </div>
      </footer>
    </div>
  )
}
