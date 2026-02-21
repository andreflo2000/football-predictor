'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface League { id: number; name: string; country: string; flag: string; confederation: string; rating: number }
interface Fixture { id: number; home: string; away: string; home_id: number; away_id: number; date: string }
interface Prediction {
  home_team: string; away_team: string
  probabilities: { home: number; draw: number; away: number }
  poisson: { home: number; draw: number; away: number }
  elo: { home: number; draw: number; away: number }
  xgboost: { home: number; draw: number; away: number }
  top_scores: Array<{ score: string; probability: number }>
  expected_goals: { home: number; away: number }
  home_stats: any; away_stats: any
}

function getProbColor(p: number) {
  if (p >= 60) return '#10b981'
  if (p >= 40) return '#f59e0b'
  return '#ef4444'
}

export default function Home() {
  const [leagues, setLeagues] = useState<League[]>([])
  const [selectedLeague, setSelectedLeague] = useState<number | null>(null)
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    axios.get(`${API_BASE}/api/leagues`).then(r => setLeagues(r.data.leagues || []))
  }, [])

  useEffect(() => {
    if (!selectedLeague) return
    setFixtures([]); setSelectedFixture(null); setPrediction(null)
    axios.get(`${API_BASE}/api/fixtures/${selectedLeague}`)
      .then(r => setFixtures(r.data.fixtures || []))
  }, [selectedLeague])

  const predict = async (fixture?: Fixture) => {
    const fix = fixture || selectedFixture
    if (!fix) return
    setLoading(true); setPrediction(null)
    try {
      const r = await axios.get(`${API_BASE}/api/predict`, {
        params: { home_team: fix.home, away_team: fix.away, league_id: selectedLeague || 39, home_team_id: fix.home_id, away_team_id: fix.away_id }
      })
      setPrediction(r.data)
    } catch { } finally { setLoading(false) }
  }

  const demoPredict = () => {
    setSelectedFixture({ id: 0, home: 'Manchester City', away: 'Arsenal', home_id: 50, away_id: 42, date: '2025-03-01' })
    setLoading(true); setPrediction(null)
    axios.get(`${API_BASE}/api/predict`, {
      params: { home_team: 'Manchester City', away_team: 'Arsenal', league_id: 39, home_team_id: 50, away_team_id: 42 }
    }).then(r => setPrediction(r.data)).catch(() => {}).finally(() => setLoading(false))
  }

  const confGroups = ['UEFA', 'CONMEBOL', 'CONCACAF', 'AFC', 'CAF', 'OFC']
  const grouped = confGroups.reduce((acc, c) => {
    acc[c] = leagues.filter(l => l.confederation === c)
    return acc
  }, {} as Record<string, League[]>)

  const prob = prediction?.probabilities
  const homeProb = prob?.home ?? 0
  const drawProb = prob?.draw ?? 0
  const awayProb = prob?.away ?? 0

  return (
    <div className="app-bg grid-bg min-h-screen">
      {/* ── HEADER ── */}
      <header className="header">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm">⚽</div>
            <span className="font-display text-xl text-white tracking-widest">FOOTPREDICT</span>
            <div className="pulse-dot ml-2 hidden sm:block" />
          </div>
          <nav className="flex items-center gap-1">
            <a href="/" className="nav-link active">Predicții</a>
            <a href="/weekly" className="nav-link">Săptămâna</a>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* ── HERO ── */}
        <div className="text-center mb-10 fade-in">
          <h1 className="font-display text-5xl sm:text-6xl text-white tracking-widest mb-3">
            PREDICȚII FOTBAL
          </h1>
          <p className="text-blue-300 text-sm font-mono uppercase tracking-widest">
            xG · Elo · XGBoost · Poisson — 100 Ligi
          </p>
        </div>

        {/* ── SELECTOR ── */}
        <div className="card p-6 mb-6 fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Liga */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Ligă</label>
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
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Meci</label>
              <select
                className="select-styled"
                value={selectedFixture?.id || ''}
                onChange={e => {
                  const f = fixtures.find(x => x.id === Number(e.target.value))
                  setSelectedFixture(f || null); setPrediction(null)
                }}
                disabled={fixtures.length === 0}
              >
                <option value="">{fixtures.length === 0 ? 'Selectează liga mai întâi...' : 'Selectează meciul...'}</option>
                {fixtures.map(f => (
                  <option key={f.id} value={f.id}>{f.home} vs {f.away}</option>
                ))}
              </select>
            </div>

            {/* Acțiuni */}
            <div className="flex flex-col gap-2 justify-end">
              <button
                className="btn-primary"
                onClick={() => predict()}
                disabled={!selectedFixture || loading}
              >
                {loading ? '⏳ Se calculează...' : '🔮 Prezice'}
              </button>
              <button className="btn-secondary text-sm" onClick={demoPredict}>
                Demo: Man City vs Arsenal
              </button>
            </div>
          </div>
        </div>

        {/* ── LOADING ── */}
        {loading && (
          <div className="flex items-center justify-center py-16 fade-in">
            <div className="text-center">
              <div className="spinner mx-auto mb-4" />
              <p className="text-blue-300 text-sm font-mono uppercase tracking-widest">Calculez predicțiile...</p>
            </div>
          </div>
        )}

        {/* ── REZULTAT ── */}
        {prediction && !loading && (
          <div className="fade-in space-y-6">
            {/* Match header card */}
            <div className="card-highlight p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="badge badge-blue">⚽ Predicție finală</span>
                <span className="text-xs font-mono text-gray-400">
                  xG: {prediction.expected_goals.home} — {prediction.expected_goals.away}
                </span>
              </div>

              <div className="flex items-center gap-4">
                {/* Home */}
                <div className="flex-1 text-center">
                  <p className="font-display text-2xl sm:text-3xl text-white tracking-wide leading-tight">
                    {prediction.home_team}
                  </p>
                  <p className="font-display text-4xl sm:text-5xl mt-2" style={{ color: getProbColor(homeProb) }}>
                    {homeProb}%
                  </p>
                  <p className="text-xs text-gray-400 mt-1 font-mono uppercase">Victorie</p>
                </div>

                {/* Draw */}
                <div className="text-center px-4">
                  <div className="text-gray-400 text-xs font-mono uppercase tracking-widest mb-1">Egal</div>
                  <div className="font-display text-3xl text-gray-300">{drawProb}%</div>
                </div>

                {/* Away */}
                <div className="flex-1 text-center">
                  <p className="font-display text-2xl sm:text-3xl text-white tracking-wide leading-tight">
                    {prediction.away_team}
                  </p>
                  <p className="font-display text-4xl sm:text-5xl mt-2" style={{ color: getProbColor(awayProb) }}>
                    {awayProb}%
                  </p>
                  <p className="text-xs text-gray-400 mt-1 font-mono uppercase">Victorie</p>
                </div>
              </div>

              {/* Prob bar */}
              <div className="score-bar mt-5">
                <div className="prob-fill-blue rounded-l-full" style={{ flex: homeProb }} />
                <div className="prob-fill-draw" style={{ flex: drawProb }} />
                <div className="prob-fill-red rounded-r-full" style={{ flex: awayProb }} />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-gray-500 mt-1">
                <span>{prediction.home_team}</span>
                <span>Egal</span>
                <span>{prediction.away_team}</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="tab-bar">
              {['overview', 'scores', 'models'].map(tab => (
                <button key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                  {tab === 'overview' ? '📊 Statistici' : tab === 'scores' ? '🎯 Scoruri exacte' : '🤖 Modele'}
                </button>
              ))}
            </div>

            {/* Overview */}
            {activeTab === 'overview' && (
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
                            <span key={i} className={`badge ${r==='W'?'badge-green':r==='D'?'badge-gray':'badge-red'}`}>{r}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Exact scores */}
            {activeTab === 'scores' && (
              <div className="card p-5 fade-in">
                <h3 className="font-display text-lg text-white tracking-wide mb-4">Top 10 Scoruri Exacte</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {prediction.top_scores.slice(0,10).map((s, i) => (
                    <div key={i} className="card-highlight p-3 text-center">
                      <div className="font-display text-2xl text-white">{s.score}</div>
                      <div className="text-xs font-mono mt-1" style={{ color: getProbColor(s.probability) }}>
                        {s.probability}%
                      </div>
                      <div className="text-[10px] font-mono text-gray-500 mt-0.5">
                        #{i+1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Models breakdown */}
            {activeTab === 'models' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 fade-in">
                {[
                  { label: 'XGBoost', icon: '🤖', weight: '40%', data: prediction.xgboost, color: '#38bdf8' },
                  { label: 'Poisson', icon: '📐', weight: '40%', data: prediction.poisson, color: '#a78bfa' },
                  { label: 'Elo',     icon: '♟',  weight: '20%', data: prediction.elo,     color: '#34d399' },
                ].map(model => (
                  <div key={model.label} className="card p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{model.icon}</span>
                        <span className="font-display text-lg text-white tracking-wide">{model.label}</span>
                      </div>
                      <span className="badge badge-blue">{model.weight}</span>
                    </div>
                    {model.data && ['home','draw','away'].map((k, i) => {
                      const labels = ['1 (Gazdă)', 'X (Egal)', '2 (Oaspete)']
                      const val = (model.data as any)[k]
                      return (
                        <div key={k} className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-400">{labels[i]}</span>
                            <span className="font-semibold" style={{ color: model.color }}>{val}%</span>
                          </div>
                          <div className="prob-bar">
                            <div className="h-full rounded-full transition-all" style={{ width: `${val}%`, background: model.color }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {!prediction && !loading && (
          <div className="text-center py-20 fade-in">
            <div className="text-6xl opacity-20 mb-4">⚽</div>
            <p className="font-display text-2xl text-gray-600 tracking-widest mb-2">SELECTEAZĂ UN MECI</p>
            <p className="text-gray-600 text-sm font-mono">sau apasă Demo pentru o predicție instantă</p>
          </div>
        )}
      </main>

      <footer className="border-t border-blue-900/40 mt-12 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-xs font-mono text-gray-600">
            FootPredict — Scop educațional. Nu reprezintă sfaturi de pariuri.
          </p>
        </div>
      </footer>
    </div>
  )
}
