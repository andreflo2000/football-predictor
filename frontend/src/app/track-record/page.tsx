'use client'
import { useState, useEffect } from 'react'
import { useLang } from '@/lib/LangContext'

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
  { label: 'Confidence > 70%',  accuracy: 78.5, sampleRo: '~0.8 picks/zi · out-of-sample',            sampleEn: '~0.8 picks/day · out-of-sample',           color: '#22c55e' },
  { label: 'Confidence ≥ 65%',  accuracy: 74.1, sampleRo: '~1.1 picks/zi · out-of-sample',            sampleEn: '~1.1 picks/day · out-of-sample',           color: '#4ade80' },
  { label: 'Confidence ≥ 60%',  accuracy: 66.4, sampleRo: '~1.5 picks/zi · out-of-sample',            sampleEn: '~1.5 picks/day · out-of-sample',           color: '#f59e0b' },
  { label_ro: 'Toate predicțiile', label_en: 'All predictions', accuracy: 54.6, sampleRo: '1.105 meciuri · Oct 2025–Mar 2026', sampleEn: '1,105 matches · Oct 2025–Mar 2026', color: '#818cf8' },
]

const leagueStats = [
  { league: 'La Liga 🇪🇸',       acc65: 86.1, acc70: 92.9, picks65: 36 },
  { league: 'Bundesliga 🇩🇪',    acc65: 79.4, acc70: 82.6, picks65: 34 },
  { league: 'Ligue 1 🇫🇷',       acc65: 79.4, acc70: 76.9, picks65: 34 },
  { league: 'Serie A 🇮🇹',       acc65: 71.1, acc70: 71.9, picks65: 45 },
  { league: 'Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿', acc65: 70.0, acc70: 71.4, picks65: 40 },
]

interface VipStats {
  total: number
  wins: number
  accuracy: number
  this_month_total: number
  this_month_wins: number
  this_month_accuracy: number
}

export default function TrackRecord() {
  const [stats, setStats]       = useState<Stats | null>(null)
  const [history, setHistory]   = useState<History | null>(null)
  const [vipStats, setVipStats] = useState<VipStats | null>(null)
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<'all' | 'high' | 'med'>('all')
  const [period, setPeriod]     = useState<'all' | 'week' | 'month' | 'year'>('all')
  const { lang }                = useLang()

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/track-record`).then(r => r.json()),
      fetch(`${API}/api/track-record/history?limit=200`).then(r => r.json()),
      fetch(`${API}/api/track-record/vip`).then(r => r.json()).catch(() => null),
    ]).then(([s, h, v]) => {
      setStats(s)
      setHistory(h)
      if (v) setVipStats(v)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const now = new Date()
  const filtered = (history?.results ?? []).filter(r => {
    // confidence filter
    if (filter === 'high' && r.confidence < 65) return false
    if (filter === 'med' && (r.confidence < 55 || r.confidence >= 65)) return false
    // period filter
    if (period !== 'all' && r.date) {
      const d = new Date(r.date)
      if (period === 'week') {
        const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7)
        if (d < weekAgo) return false
      } else if (period === 'month') {
        const monthAgo = new Date(now); monthAgo.setMonth(now.getMonth() - 1)
        if (d < monthAgo) return false
      } else if (period === 'year') {
        const yearAgo = new Date(now); yearAgo.setFullYear(now.getFullYear() - 1)
        if (d < yearAgo) return false
      }
    }
    return true
  })

  const filteredSummary = {
    total: filtered.length,
    wins: filtered.filter(r => r.result === 'win').length,
    losses: filtered.filter(r => r.result === 'loss').length,
    accuracy: filtered.length > 0 ? Math.round(filtered.filter(r => r.result === 'win').length / filtered.length * 100) : 0,
  }

  const hasLiveData = (history?.summary.total ?? 0) > 0

  return (
    <div style={{ overflowX: 'hidden', minHeight: '100vh' }} className="app-bg grid-bg">

      <main className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="text-center mb-8 fade-in">
          <div className="text-4xl mb-2">📊</div>
          <h1 className="font-display text-4xl text-white mb-1" style={{ letterSpacing: '0.05em' }}>
            TRACK RECORD
          </h1>
          <div className="text-green-400 text-xs font-mono uppercase tracking-widest mb-1">
            {lang === 'en' ? 'Full transparency · Real data · Updated daily' : 'Transparență totală · Date reale · Actualizat zilnic'}
          </div>

          <p className="text-gray-600 text-xs font-mono">
            {lang === 'en'
              ? `Out-of-sample backtest 1,105 matches · Oct 2025–Mar 2026 · Live tracking since ${stats?.tracking_since || 'April 2026'}`
              : `Backtest out-of-sample 1.105 meciuri · Oct 2025–Mar 2026 · Tracking live din ${stats?.tracking_since || 'Aprilie 2026'}`}
          </p>
        </div>

        {/* Period + confidence filters */}
        {hasLiveData && (
          <div className="flex flex-wrap gap-2 mb-5 fade-in">
            <div className="flex gap-1 flex-1">
              {([['all', lang === 'en' ? 'All time' : 'Toate'], ['week', lang === 'en' ? 'Week' : 'Săptămână'], ['month', lang === 'en' ? 'Month' : 'Lună'], ['year', lang === 'en' ? 'Year' : 'An']] as [typeof period, string][]).map(([key, label]) => (
                <button key={key} onClick={() => setPeriod(key)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold font-mono transition-all"
                  style={{
                    background: period === key ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${period === key ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    color: period === key ? '#22c55e' : '#6b7280',
                  }}>{label}</button>
              ))}
            </div>
            {period !== 'all' && filteredSummary.total > 0 && (
              <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-[11px] font-mono"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="text-emerald-400 font-bold">{filteredSummary.wins}W</span>
                <span className="text-red-400 font-bold">{filteredSummary.losses}L</span>
                <span className="text-white font-bold">{filteredSummary.accuracy}%</span>
              </div>
            )}
          </div>
        )}

        {/* 👑 VIP Picks — secțiune prominentă */}
        <div className="card p-5 mb-6 fade-in" style={{ border: '1px solid rgba(234,179,8,0.35)', background: 'rgba(234,179,8,0.04)' }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">👑</span>
            <div>
              <div className="text-sm font-bold text-amber-400 uppercase tracking-widest">VIP Picks Performance</div>
              <div className="text-[10px] text-gray-500 font-mono">
                {lang === 'en' ? 'Confidence ≥75% · Top-tier selections · Pro plan exclusive' : 'Confidence ≥75% · Selecții de top · Exclusiv plan Pro'}
              </div>
            </div>
          </div>

          {/* Backtesting baseline */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)' }}>
              <div className="text-2xl font-bold font-mono text-amber-400">78.5%</div>
              <div className="text-[10px] text-gray-500 font-mono mt-1">
                {lang === 'en' ? 'Accuracy (conf >70%)' : 'Acuratețe (conf >70%)'}
              </div>
              <div className="text-[9px] text-gray-700 font-mono mt-0.5">backtest 1.105 meciuri</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {vipStats && vipStats.total > 0 ? `${vipStats.accuracy}%` : '—'}
              </div>
              <div className="text-[10px] text-gray-500 font-mono mt-1">
                {lang === 'en' ? 'Live accuracy (all time)' : 'Acuratețe live (total)'}
              </div>
              <div className="text-[9px] text-gray-700 font-mono mt-0.5">
                {vipStats && vipStats.total > 0 ? `${vipStats.wins}/${vipStats.total} picks` : lang === 'en' ? 'collecting data...' : 'se colectează date...'}
              </div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <div className="text-2xl font-bold font-mono text-blue-400">
                {vipStats && vipStats.this_month_total > 0 ? `${vipStats.this_month_accuracy}%` : '—'}
              </div>
              <div className="text-[10px] text-gray-500 font-mono mt-1">
                {lang === 'en' ? 'This month' : 'Luna aceasta'}
              </div>
              <div className="text-[9px] text-gray-700 font-mono mt-0.5">
                {vipStats && vipStats.this_month_total > 0
                  ? `${vipStats.this_month_wins}/${vipStats.this_month_total} picks`
                  : lang === 'en' ? 'no results yet' : 'fără rezultate încă'}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-[10px] text-gray-600 font-mono">
              {lang === 'en'
                ? '~0.8 VIP picks/day · highest-confidence model output'
                : '~0.8 picks VIP/zi · output model cu cea mai mare certitudine'}
            </div>
            <a href="/upgrade" className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
              style={{ background: 'linear-gradient(90deg,#f59e0b,#ef4444)', color: 'white' }}>
              {lang === 'en' ? 'Pro $20 →' : 'Pro 99 RON →'}
            </a>
          </div>
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
              <div className="text-[10px] font-mono text-gray-500 mt-1">{lang === 'en' ? 'Accuracy ≥65% conf (live)' : 'Acuratețe ≥65% conf (live)'}</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-3xl font-bold font-mono text-amber-400">{history.summary.accuracy}%</div>
              <div className="text-[10px] font-mono text-gray-500 mt-1">{lang === 'en' ? 'Overall accuracy (live)' : 'Acuratețe generală (live)'}</div>
            </div>
          </div>
        )}

        {/* Equity Curve Chart */}
        {hasLiveData && history && history.results.length > 1 && (() => {
          const pts = history.results.map((r, i) => {
            const cumEq = history.results.slice(0, i + 1).reduce((s, x) => s + x.equity, 0)
            return cumEq
          })
          const W = 600, H = 140, PAD = 24
          const minV = Math.min(0, ...pts), maxV = Math.max(0, ...pts)
          const range = maxV - minV || 1
          const x = (i: number) => PAD + (i / (pts.length - 1)) * (W - PAD * 2)
          const y = (v: number) => PAD + (1 - (v - minV) / range) * (H - PAD * 2)
          const zero = y(0)
          const pathD = pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
          const fillD = `${pathD} L${x(pts.length - 1).toFixed(1)},${zero.toFixed(1)} L${x(0).toFixed(1)},${zero.toFixed(1)} Z`
          const isPositive = pts[pts.length - 1] >= 0
          const color = isPositive ? '#22c55e' : '#f87171'
          return (
            <div className="card mb-6 fade-in" style={{ padding: '16px 12px 8px' }}>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 text-center">
                {lang === 'en' ? 'Equity Curve (1u stake)' : 'Curbă Equity (stake 1u)'}
              </div>
              <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
                <defs>
                  <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                {/* Grid lines */}
                {[0.25, 0.5, 0.75].map(t => (
                  <line key={t} x1={PAD} x2={W - PAD} y1={PAD + t * (H - PAD * 2)} y2={PAD + t * (H - PAD * 2)}
                    stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                ))}
                {/* Zero line */}
                <line x1={PAD} x2={W - PAD} y1={zero} y2={zero}
                  stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="4,4" />
                {/* Fill */}
                <path d={fillD} fill="url(#eqGrad)" />
                {/* Line */}
                <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {/* Last point dot */}
                <circle cx={x(pts.length - 1)} cy={y(pts[pts.length - 1])} r="4" fill={color} />
                {/* Labels */}
                <text x={PAD} y={H - 4} fontSize="9" fill="#4b5563" fontFamily="monospace">0</text>
                <text x={W - PAD} y={H - 4} fontSize="9" fill="#4b5563" fontFamily="monospace" textAnchor="end">{history.results.length} picks</text>
                <text x={W - PAD + 2} y={y(pts[pts.length - 1]) + 4} fontSize="10" fill={color} fontFamily="monospace" fontWeight="bold">
                  {pts[pts.length - 1] >= 0 ? '+' : ''}{pts[pts.length - 1].toFixed(1)}u
                </text>
              </svg>
            </div>
          )
        })()}

        {/* Backtesting */}
        <div className="mb-6 fade-in">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 text-center">
            {lang === 'en' ? 'Backtesting · 225,000 matches · 2010–2025' : 'Backtesting · 225.000 meciuri · 2010–2025'}
          </div>
          <div className="space-y-3">
            {backtesting.map((b: any) => (
              <div key={b.label ?? b.label_ro} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm font-bold text-white">{b.label ?? (lang === 'en' ? b.label_en : b.label_ro)}</div>
                    <div className="text-[10px] text-gray-600 font-mono">{lang === 'en' ? b.sampleEn : b.sampleRo}</div>
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
            {lang === 'en' ? '* Random baseline = 33.3% · Model outperforms chance by +50%' : '* Random baseline = 33.3% · Modelul depășește cu +50% față de hazard'}
          </div>
        </div>

        {/* Tabel istoric detaliat */}
        <div className="mb-6 fade-in">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              {lang === 'en' ? 'Detailed history' : 'Istoric detaliat'}
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
                  {f === 'all' ? (lang === 'en' ? 'All' : 'Toate') : f === 'high' ? '≥65%' : '55-65%'}
                </button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="card p-8 text-center">
              <div className="spinner mx-auto mb-3" />
              <div className="text-gray-600 text-xs font-mono">{lang === 'en' ? 'Loading history...' : 'Se încarcă istoricul...'}</div>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1f2937' }}>
                      <th className="text-left p-3 text-gray-600">{lang === 'en' ? 'Date' : 'Data'}</th>
                      <th className="text-left p-3 text-gray-600">{lang === 'en' ? 'Match' : 'Meci'}</th>
                      <th className="text-center p-3 text-gray-600">Conf</th>
                      <th className="text-center p-3 text-gray-600">{lang === 'en' ? 'Score' : 'Scor'}</th>
                      <th className="text-center p-3 text-gray-600">{lang === 'en' ? 'Result' : 'Rezultat'}</th>
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
              <div className="text-gray-500 text-sm font-mono mb-1">{lang === 'en' ? 'Live tracking since April 2026' : 'Tracking activ din Aprilie 2026'}</div>
              <div className="text-gray-700 text-xs font-mono">
                {lang === 'en' ? 'Results appear after matches finish and are auto-marked at 23:30.' : 'Rezultatele apar după finalizarea meciurilor și marcarea automată la 23:30.'}
              </div>
            </div>
          )}
        </div>

        {/* Per ligă */}
        <div className="mb-6 fade-in">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 text-center">
            {lang === 'en' ? 'Accuracy per league · Out-of-sample Oct 2025–Mar 2026' : 'Acuratețe per ligă · Out-of-sample Oct 2025–Mar 2026'}
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr style={{ borderBottom: '1px solid #1f2937' }}>
                  <th className="text-left p-3 text-gray-600">{lang === 'en' ? 'League' : 'Ligă'}</th>
                  <th className="text-center p-3 text-gray-600">Conf ≥65%</th>
                  <th className="text-center p-3 text-gray-600">Conf ≥70%</th>
                  <th className="text-right p-3 text-gray-600">{lang === 'en' ? 'Picks analysed' : 'Picks analizate'}</th>
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
            {lang === 'en' ? '* Valid only with available odds · 6-month out-of-sample backtest' : '* Valide doar cu cote disponibile · Backtest out-of-sample pe 6 luni'}
          </div>
        </div>

        {/* Metodologie */}
        <div className="card p-5 fade-in">
          <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3">{lang === 'en' ? 'Methodology' : 'Metodologie'}</div>
          <div className="space-y-2 text-xs text-gray-400 leading-relaxed">
            <p>· <strong className="text-gray-300">Model:</strong> {lang === 'en' ? 'XGBoost gradient boosting — ensemble of decision trees trained on structured football data' : 'XGBoost gradient boosting — ansamblu de arbori de decizie antrenați pe date structurate de fotbal'}</p>
            <p>· <strong className="text-gray-300">{lang === 'en' ? 'Training:' : 'Antrenament:'}</strong> {lang === 'en' ? '225,000 matches · major European leagues · 2010–2025 · out-of-sample validation' : '225.000 meciuri · ligi majore europene · 2010–2025 · validare out-of-sample'}</p>
            <p>· <strong className="text-gray-300">{lang === 'en' ? 'Features:' : 'Variabile:'}</strong> {lang === 'en' ? 'Elo ratings · home/away venue form · rolling windows (short/medium/long term) · H2H history · xG proxies · market odds signals' : 'Rating Elo · formă acasă/deplasare separată · ferestre temporale multiple · istoric H2H · proxy xG · semnale din cotele de piață'}</p>
            <p>· <strong className="text-gray-300">{lang === 'en' ? 'Market:' : 'Piață evaluată:'}</strong> {lang === 'en' ? '1X2 full-time result · O/U 2.5 goals · BTTS' : '1X2 rezultat final · Peste/Sub 2.5 goluri · Ambele marchează'}</p>
            <p>· <strong className="text-gray-300">Value bet:</strong> {lang === 'en' ? 'Detected when model probability exceeds implied market probability — edge measured against sharp bookmaker lines' : 'Detectat când probabilitatea modelului depășește probabilitatea implicită a pieței — edge măsurat față de cotele sharp'}</p>
            <p>· <strong className="text-gray-300">{lang === 'en' ? 'Published picks:' : 'Picks publicate:'}</strong> {lang === 'en' ? 'Only matches where model has sufficient confidence · higher-confidence picks reserved for VIP tier' : 'Doar meciurile unde modelul are suficientă certitudine · picks cu certitudine ridicată rezervate abonamentului VIP'}</p>
            <p>· <strong className="text-gray-300">Equity curve:</strong> {lang === 'en' ? 'Fixed 1-unit stake per pick · avg odds ~2.0 · tracks live performance from April 2026' : 'Stake fix 1 unitate per pick · odds medii ~2.0 · urmărește performanța live din Aprilie 2026'}</p>
            <p>· <strong className="text-gray-300">Auto-update:</strong> {lang === 'en' ? 'Results fetched and auto-marked daily at 23:30 from official football data sources' : 'Rezultatele sunt preluate și marcate automat zilnic la 23:30 din surse oficiale de date fotbal'}</p>
          </div>
        </div>

        <div className="text-center mt-6 text-[10px] text-gray-700 font-mono">
          {lang === 'en' ? 'Past performance does not guarantee future results. Statistical analysis · Not betting advice.' : 'Performanțele trecute nu garantează rezultate viitoare. Analiză statistică · Nu sfat de pariere.'}
        </div>
      </main>
    </div>
  )
}
