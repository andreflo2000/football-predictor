'use client'
import { useState, useEffect } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://football-predictor-api-n9sl.onrender.com'

interface Stats {
  total: number
  high_conf_total: number
  high_conf_wins: number
  high_conf_accuracy: number
  med_conf_total: number
  med_conf_wins: number
  med_conf_accuracy: number
  tracking_since: string
  days_tracked: number
}

interface PickResult {
  date: string
  home: string
  away: string
  result: 'win' | 'loss' | 'void'
  confidence: number
  actual_score: string
  equity: number
}

interface History {
  results: PickResult[]
  summary: {
    total: number
    wins: number
    losses: number
    accuracy: number
    high_conf_accuracy: number
    final_equity: number
  }
}

const backtesting = [
  { label: 'Confidence > 70%',  accuracy: 78.5, sample: '~0.8 picks/zi · out-of-sample', color: '#22c55e' },
  { label: 'Confidence ≥ 65%',  accuracy: 74.1, sample: '~1.1 picks/zi · out-of-sample', color: '#4ade80' },
  { label: 'Confidence ≥ 60%',  accuracy: 66.4, sample: '~1.5 picks/zi · out-of-sample', color: '#f59e0b' },
  { label: 'Toate predicțiile', accuracy: 54.6, sample: '1.105 meciuri · Oct 2025–Mar 2026', color: '#818cf8' },
]

const leagueStats = [
  { league: 'La Liga 🇪🇸',       acc65: 86.1, acc70: 92.9, picks65: 36 },
  { league: 'Bundesliga 🇩🇪',    acc65: 79.4, acc70: 82.6, picks65: 34 },
  { league: 'Ligue 1 🇫🇷',       acc65: 79.4, acc70: 76.9, picks65: 34 },
  { league: 'Serie A 🇮🇹',       acc65: 71.1, acc70: 71.9, picks65: 45 },
  { league: 'Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿', acc65: 70.0, acc70: 71.4, picks65: 40 },
]

export default function TrackRecord() {
  const [stats, setStats]     = useState<Stats | null>(null)
  const [history, setHistory] = useState<History | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<'all' | 'high' | 'med'>('all')

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/track-record`).then(r => r.json()),
      fetch(`${API}/api/track-record/history?limit=200`).then(r => r.json()),
    ]).then(([s, h]) => {
      setStats(s)
      setHistory(h)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filtered = history?.results.filter(r => {
    if (filter === 'high') return r.confidence >= 65
    if (filter === 'med')  return r.confidence >= 55 && r.confidence < 65
    return true
  }) ?? []

  const hasLiveData = (history?.summary.total ?? 0) > 0

  return (
    <div style={{ overflowX: 'hidden', minHeight: '100vh' }} className="app-bg grid-bg">
      <header className="header">
        <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Flopi San" className="w-10 h-10" />
            <div>
              <div className="font-display text-lg text-white tracking-widest leading-none">FLOPI SAN</div>
              <div className="text-[9px] font-mono text-green-400 tracking-[0.2em] uppercase">Forecast Academy</div>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            <a href="/daily" className="nav-link">🎯 Picks zilnice</a>
            <a href="/weekly" className="nav-link">Săptămânal</a>
            <a href="/upgrade" className="nav-link" style={{ color: '#facc15' }}>⚡ Upgrade</a>
          </nav>
        </div>
      </header>
      <div className="header-spacer" />

      <main className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="text-center mb-8 fade-in">
          <div className="text-4xl mb-2">📊</div>
          <h1 className="font-display text-4xl text-white mb-1" style={{ letterSpacing: '0.05em' }}>
            TRACK RECORD
          </h1>
          <div className="text-green-400 text-xs font-mono uppercase tracking-widest mb-1">
            Transparență totală · Date reale · Actualizat zilnic
          </div>
          <p className="text-gray-600 text-xs font-mono">
            Backtest out-of-sample 1.105 meciuri · Oct 2025–Mar 2026 · Tracking live din {stats?.tracking_since || 'Aprilie 2026'}
          </p>
        </div>

        {/* Live summary cards */}
        {hasLiveData && history && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 fade-in">
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold font-mono text-white">{history.summary.total}</div>
              <div className="text-[10px] font-mono text-gray-500 mt-1">Total picks</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold font-mono text-green-400">{history.summary.wins}</div>
              <div className="text-[10px] font-mono text-gray-500 mt-1">Wins</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold font-mono text-red-400">{history.summary.losses}</div>
              <div className="text-[10px] font-mono text-gray-500 mt-1">Losses</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold font-mono"
                style={{ color: history.summary.final_equity >= 0 ? '#22c55e' : '#f87171' }}>
                {history.summary.final_equity >= 0 ? '+' : ''}{history.summary.final_equity}u
              </div>
              <div className="text-[10px] font-mono text-gray-500 mt-1">Profit (1u stake)</div>
            </div>
          </div>
        )}

        {/* Acuratete live */}
        {hasLiveData && history && (
          <div className="grid grid-cols-2 gap-3 mb-6 fade-in">
            <div className="card p-4 text-center">
              <div className="text-3xl font-bold font-mono text-green-400">{history.summary.high_conf_accuracy}%</div>
              <div className="text-[10px] font-mono text-gray-500 mt-1">Acuratețe ≥65% conf (live)</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-3xl font-bold font-mono text-amber-400">{history.summary.accuracy}%</div>
              <div className="text-[10px] font-mono text-gray-500 mt-1">Acuratețe generală (live)</div>
            </div>
          </div>
        )}

        {/* Backtesting */}
        <div className="mb-6 fade-in">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 text-center">
            Backtesting · 225.000 meciuri · 2010–2025
          </div>
          <div className="space-y-3">
            {backtesting.map(b => (
              <div key={b.label} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm font-bold text-white">{b.label}</div>
                    <div className="text-[10px] text-gray-600 font-mono">{b.sample}</div>
                  </div>
                  <div className="text-3xl font-bold font-mono" style={{ color: b.color }}>
                    {b.accuracy}%
                  </div>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${b.accuracy}%`, background: b.color }} />
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-2 text-[10px] text-gray-700 font-mono">
            * Random baseline = 33.3% · Modelul depășește cu +50% față de hazard
          </div>
        </div>

        {/* Tabel istoric detaliat */}
        <div className="mb-6 fade-in">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Istoric detaliat
            </div>
            <div className="flex gap-1">
              {(['all', 'high', 'med'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className="text-[10px] font-mono px-2 py-1 rounded transition-all"
                  style={{
                    background: filter === f ? '#22c55e22' : 'transparent',
                    color: filter === f ? '#22c55e' : '#6b7280',
                    border: `1px solid ${filter === f ? '#22c55e44' : '#1f2937'}`,
                  }}>
                  {f === 'all' ? 'Toate' : f === 'high' ? '≥65%' : '55-65%'}
                </button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="card p-8 text-center">
              <div className="spinner mx-auto mb-3" />
              <div className="text-gray-600 text-xs font-mono">Se încarcă istoricul...</div>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1f2937' }}>
                      <th className="text-left p-3 text-gray-600">Data</th>
                      <th className="text-left p-3 text-gray-600">Meci</th>
                      <th className="text-center p-3 text-gray-600">Conf</th>
                      <th className="text-center p-3 text-gray-600">Scor</th>
                      <th className="text-center p-3 text-gray-600">Rezultat</th>
                      <th className="text-right p-3 text-gray-600">Equity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #111827' }}
                        className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-3 text-gray-500">{r.date}</td>
                        <td className="p-3 text-gray-300">{r.home} – {r.away}</td>
                        <td className="p-3 text-center">
                          <span style={{
                            color: r.confidence >= 65 ? '#22c55e' : r.confidence >= 55 ? '#f59e0b' : '#818cf8'
                          }}>{r.confidence}%</span>
                        </td>
                        <td className="p-3 text-center text-gray-500">{r.actual_score || '—'}</td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{
                            background: r.result === 'win' ? '#16a34a22' : r.result === 'loss' ? '#dc262622' : '#37415122',
                            color: r.result === 'win' ? '#4ade80' : r.result === 'loss' ? '#f87171' : '#9ca3af',
                          }}>
                            {r.result.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 text-right" style={{
                          color: r.equity >= 0 ? '#4ade80' : '#f87171'
                        }}>
                          {r.equity >= 0 ? '+' : ''}{r.equity}u
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="card p-8 text-center">
              <div className="text-3xl mb-3 opacity-40">🕐</div>
              <div className="text-gray-500 text-sm font-mono mb-1">Tracking activ din Aprilie 2026</div>
              <div className="text-gray-700 text-xs font-mono">
                Rezultatele apar după finalizarea meciurilor și marcarea automată la 23:30.
              </div>
            </div>
          )}
        </div>

        {/* Per ligă */}
        <div className="mb-6 fade-in">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 text-center">
            Acuratețe per ligă · Out-of-sample Oct 2025–Mar 2026
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr style={{ borderBottom: '1px solid #1f2937' }}>
                  <th className="text-left p-3 text-gray-600">Ligă</th>
                  <th className="text-center p-3 text-gray-600">Conf ≥65%</th>
                  <th className="text-center p-3 text-gray-600">Conf ≥70%</th>
                  <th className="text-right p-3 text-gray-600">Picks analizate</th>
                </tr>
              </thead>
              <tbody>
                {leagueStats.map((l, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #111827' }}>
                    <td className="p-3 text-gray-300">{l.league}</td>
                    <td className="p-3 text-center font-bold" style={{ color: l.acc65 >= 80 ? '#4ade80' : l.acc65 >= 70 ? '#f59e0b' : '#818cf8' }}>
                      {l.acc65}%
                    </td>
                    <td className="p-3 text-center font-bold" style={{ color: l.acc70 >= 80 ? '#4ade80' : '#f59e0b' }}>
                      {l.acc70}%
                    </td>
                    <td className="p-3 text-right text-gray-500">{l.picks65}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-center mt-2 text-[10px] text-gray-700 font-mono">
            * Valide doar cu cote disponibile · Backtest out-of-sample pe 6 luni
          </div>
        </div>

        {/* Metodologie */}
        <div className="card p-5 fade-in">
          <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3">Metodologie</div>
          <div className="space-y-2 text-xs text-gray-400 leading-relaxed">
            <p>· <strong className="text-gray-300">Model:</strong> XGBoost cu 84 de variabile (Elo, formă, xG, H2H, cote)</p>
            <p>· <strong className="text-gray-300">Antrenament:</strong> 225.000 meciuri din ligile majore europene (2010–2025)</p>
            <p>· <strong className="text-gray-300">Piață evaluată:</strong> 1X2 (rezultat final)</p>
            <p>· <strong className="text-gray-300">Equity curve:</strong> stake fix 1 unitate, odds medii 2.0 (even money)</p>
            <p>· <strong className="text-gray-300">Auto-update:</strong> rezultatele se marchează automat zilnic la 23:30 din API-Football</p>
          </div>
        </div>

        <div className="text-center mt-6 text-[10px] text-gray-700 font-mono">
          Performanțele trecute nu garantează rezultate viitoare. Analiză statistică · Nu sfat de pariere.
        </div>
      </main>
    </div>
  )
}
