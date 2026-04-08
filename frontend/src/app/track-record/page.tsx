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

export default function TrackRecord() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/api/track-record`)
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const backtesting = [
    { label: 'Confidence ≥ 65%', accuracy: 75, sample: '~33K meciuri', color: '#22c55e' },
    { label: 'Confidence ≥ 55%', accuracy: 65, sample: '~85K meciuri', color: '#f59e0b' },
    { label: 'Toate predicțiile', accuracy: 49.8, sample: '225K meciuri', color: '#818cf8' },
  ]

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
            <a href="/" className="nav-link">Predicții AI</a>
            <a href="/daily" className="nav-link">🎯 Selecțiile zilei</a>
            <a href="/weekly" className="nav-link">Rezultate</a>
          </nav>
        </div>
      </header>
      <div className="header-spacer" />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8 fade-in">
          <div className="text-4xl mb-2">📊</div>
          <h1 className="font-display text-4xl text-white mb-1" style={{ letterSpacing: '0.05em' }}>
            TRACK RECORD
          </h1>
          <div className="text-green-400 text-xs font-mono uppercase tracking-widest mb-1">
            Transparență totală · Date reale
          </div>
          <p className="text-gray-600 text-xs font-mono">
            Acuratețea modelului XGBoost pe date istorice + tracking live din {stats?.tracking_since || 'Aprilie 2026'}
          </p>
        </div>

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

        {/* Live tracking */}
        <div className="mb-6 fade-in">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 text-center">
            Tracking Live · Din {stats?.tracking_since || 'Aprilie 2026'}
          </div>

          {loading && (
            <div className="card p-8 text-center">
              <div className="spinner mx-auto mb-3" />
              <div className="text-gray-600 text-xs font-mono">Se încarcă statisticile...</div>
            </div>
          )}

          {!loading && stats && stats.total > 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold font-mono text-green-400">{stats.high_conf_accuracy}%</div>
                  <div className="text-[10px] font-mono text-gray-500 mt-1">Acuratețe HIGH conf</div>
                  <div className="text-[9px] text-gray-700 font-mono">{stats.high_conf_wins}/{stats.high_conf_total} corecte</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold font-mono text-amber-400">{stats.med_conf_accuracy}%</div>
                  <div className="text-[10px] font-mono text-gray-500 mt-1">Acuratețe MEDIUM conf</div>
                  <div className="text-[9px] text-gray-700 font-mono">{stats.med_conf_wins}/{stats.med_conf_total} corecte</div>
                </div>
              </div>
              <div className="card p-3 text-center">
                <div className="text-[10px] text-gray-600 font-mono">
                  {stats.total} predicții urmărite · {stats.days_tracked} zile
                </div>
              </div>
            </div>
          )}

          {!loading && (!stats || stats.total === 0) && (
            <div className="card p-8 text-center">
              <div className="text-3xl mb-3 opacity-40">🕐</div>
              <div className="text-gray-500 text-sm font-mono mb-1">Tracking activ din Aprilie 2026</div>
              <div className="text-gray-700 text-xs font-mono">
                Rezultatele se actualizează zilnic după finalizarea meciurilor.
                Revino în câteva zile pentru statistici live.
              </div>
            </div>
          )}
        </div>

        {/* Metodologie */}
        <div className="card p-5 fade-in">
          <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3">Metodologie</div>
          <div className="space-y-2 text-xs text-gray-400 leading-relaxed">
            <p>· <strong className="text-gray-300">Model:</strong> XGBoost cu 84 de variabile (Elo, formă, xG, H2H, cote)</p>
            <p>· <strong className="text-gray-300">Antrenament:</strong> 225.000 meciuri din ligile majore europene (2010–2025)</p>
            <p>· <strong className="text-gray-300">Piață evaluată:</strong> 1X2 (rezultat final)</p>
            <p>· <strong className="text-gray-300">Confidence:</strong> probabilitatea maximă prezisă de model pentru un outcome</p>
            <p>· <strong className="text-gray-300">Tracking live:</strong> fiecare predicție HIGH conf este logată în DB cu timestamp, rezultatul se actualizează manual după meci</p>
          </div>
        </div>

        <div className="text-center mt-6 text-[10px] text-gray-700 font-mono">
          Performanțele trecute nu garantează rezultate viitoare.
          Analiză statistică · Nu sfat de pariere.
        </div>
      </main>
    </div>
  )
}
