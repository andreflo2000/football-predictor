'use client'

import { useState, useEffect } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function today() {
  return new Date().toISOString().split('T')[0]
}
function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

interface Pick {
  home: string
  away: string
  league: string
  flag: string
  time: string
  home_win: number
  draw: number
  away_win: number
  prediction: 'H' | 'D' | 'A'
  prediction_label: string
  confidence: number
  confidence_level: 'high' | 'medium' | 'low'
  high_confidence: boolean
  home_elo: number
  away_elo: number
  home_form: number
  away_form: number
}

interface DailyResponse {
  date: string
  total_fixtures: number
  total_picks: number
  high_conf: number
  med_conf: number
  picks: Pick[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function confColor(level: string) {
  if (level === 'high')   return { bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.35)',  text: '#22c55e', label: 'RIDICATĂ' }
  if (level === 'medium') return { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', text: '#f59e0b', label: 'MEDIE' }
  return                         { bg: 'rgba(99,102,241,0.10)', border: 'rgba(99,102,241,0.30)', text: '#818cf8', label: 'SCĂZUTĂ' }
}

function predLabel(p: Pick) {
  if (p.prediction === 'H') return { emoji: '🏠', short: '1',  full: p.home,  prob: p.home_win }
  if (p.prediction === 'A') return { emoji: '✈️', short: '2',  full: p.away,  prob: p.away_win }
  return                           { emoji: '🤝', short: 'X',  full: 'Egal',  prob: p.draw }
}

function FormBar({ pct, label }: { pct: number; label: string }) {
  const color = pct >= 60 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-gray-500 font-mono w-14 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/5">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-mono shrink-0" style={{ color }}>{pct}%</span>
    </div>
  )
}

// ── PickCard ─────────────────────────────────────────────────────────────────

function PickCard({ pick, rank }: { pick: Pick; rank: number }) {
  const c    = confColor(pick.confidence_level)
  const pred = predLabel(pick)

  return (
    <div className="card p-4 mb-3" style={{ borderColor: c.border }}>

      {/* Header: Liga + ora + rank */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-base">{pick.flag}</span>
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{pick.league}</span>
          {pick.time && <span className="text-[10px] font-mono text-gray-600 ml-1">· {pick.time}</span>}
        </div>
        <div className="flex items-center gap-2">
          {pick.high_confidence && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full font-mono"
              style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
              ⚡ HIGH CONF
            </span>
          )}
          <span className="text-[10px] font-mono text-gray-700">#{rank}</span>
        </div>
      </div>

      {/* Echipe */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="text-base font-bold text-white leading-tight truncate">{pick.home}</div>
          <div className="text-[10px] font-mono text-gray-500 mt-0.5">
            Elo {pick.home_elo} · Formă {pick.home_form}%
          </div>
        </div>
        <div className="text-gray-600 font-bold text-sm mx-3 shrink-0">VS</div>
        <div className="flex-1 min-w-0 text-right">
          <div className="text-base font-bold text-white leading-tight truncate">{pick.away}</div>
          <div className="text-[10px] font-mono text-gray-500 mt-0.5">
            Elo {pick.away_elo} · Formă {pick.away_form}%
          </div>
        </div>
      </div>

      {/* Probabilitati */}
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {[
          { label: '1', val: pick.home_win, active: pick.prediction === 'H' },
          { label: 'X', val: pick.draw,     active: pick.prediction === 'D' },
          { label: '2', val: pick.away_win, active: pick.prediction === 'A' },
        ].map(({ label, val, active }) => (
          <div key={label} className="rounded-lg py-2 text-center"
            style={{
              background: active ? c.bg : 'rgba(255,255,255,0.03)',
              border: `1px solid ${active ? c.border : 'rgba(255,255,255,0.06)'}`,
            }}>
            <div className="text-[10px] font-mono text-gray-500 uppercase">{label}</div>
            <div className="text-lg font-bold font-mono" style={{ color: active ? c.text : '#6b7280' }}>
              {val}%
            </div>
          </div>
        ))}
      </div>

      {/* Predictie + Confidence */}
      <div className="flex items-center justify-between px-3 py-2 rounded-xl"
        style={{ background: c.bg, border: `1px solid ${c.border}` }}>
        <div className="flex items-center gap-2">
          <span className="text-base">{pred.emoji}</span>
          <div>
            <div className="text-xs font-bold" style={{ color: c.text }}>
              {pred.short} — {pred.full}
            </div>
            <div className="text-[10px] font-mono text-gray-500">Predicție AI</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold font-mono" style={{ color: c.text }}>
            {pick.confidence}%
          </div>
          <div className="text-[9px] font-mono" style={{ color: c.text }}>
            {c.label}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 3 Ponturi Gratuite ───────────────────────────────────────────────────────

function FreePicks({ picks }: { picks: Pick[] }) {
  if (picks.length === 0) return null

  // Top 3 cele mai bune picks din 3 meciuri diferite
  const seen = new Set<string>()
  const top3: Pick[] = []
  for (const p of picks) {
    const key = `${p.home}-${p.away}`
    if (!seen.has(key)) { seen.add(key); top3.push(p) }
    if (top3.length === 3) break
  }
  if (top3.length < 1) return null

  // Cota combinata (acumulator)
  const margin = 1.08
  const oddSingle = (prob: number) => parseFloat((100 / Math.max(prob, 1) * margin).toFixed(2))
  const comboOdd  = top3.reduce((acc, p) => {
    const prob = p.prediction === 'H' ? p.home_win : p.prediction === 'A' ? p.away_win : p.draw
    return acc * oddSingle(prob)
  }, 1)

  return (
    <div className="mb-6 fade-in">
      {/* Header card */}
      <div className="rounded-2xl p-4 mb-3"
        style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.06))', border: '1px solid rgba(251,191,36,0.3)' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs font-bold text-amber-400 uppercase tracking-widest">🎁 Ponturi Gratuite</div>
            <div className="text-[10px] text-gray-500 font-mono mt-0.5">Top 3 selecții · Cele mai probabile rezultate</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Acumulator estimat</div>
            <div className="text-2xl font-bold font-mono text-amber-400">x{comboOdd.toFixed(2)}</div>
          </div>
        </div>

        <div className="space-y-2">
          {top3.map((p, i) => {
            const pred   = predLabel(p)
            const prob   = pred.prob
            const odd    = oddSingle(prob)
            const c      = confColor(p.confidence_level)
            const medals = ['🥇', '🥈', '🥉']
            return (
              <div key={i} className="flex items-center gap-3 bg-black/20 rounded-xl px-3 py-2.5">
                <span className="text-base shrink-0">{medals[i]}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {p.flag} {p.home} <span className="text-gray-500">vs</span> {p.away}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded font-mono"
                      style={{ backgroundColor: `${c.text}20`, color: c.text }}>
                      {pred.short} — {pred.full}
                    </span>
                    <span className="text-[10px] text-gray-600 font-mono">{p.league}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold font-mono text-amber-400">~{odd.toFixed(2)}</div>
                  <div className="text-[10px] font-mono" style={{ color: c.text }}>{prob}%</div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-3 pt-3 border-t border-amber-900/30 flex items-center justify-between">
          <div className="text-[10px] text-gray-600 font-mono">* Cote estimate cu marjă 8%</div>
          <button
            onClick={() => {
              const lines = top3.map((p, i) => {
                const pred = predLabel(p)
                const prob = pred.prob
                const odd  = oddSingle(prob)
                return `${i+1}. ${p.flag} ${p.home} vs ${p.away}\n   ➤ ${pred.short} — ${pred.full} · cotă ~${odd.toFixed(2)} · ${prob}% conf`
              }).join('\n\n')
              const text = `🎁 *FLOPI SAN — 3 Ponturi Gratuite ${formatDate(new Date().toISOString().split('T')[0])}*\n\n${lines}\n\n📦 Acumulator estimat: *x${comboOdd.toFixed(2)}*\n\n🤖 _Flopi San Forecast Academy_\n🌐 flopiforecastro.vercel.app`
              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
            }}
            className="text-[10px] font-bold px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
            📤 Share bilet
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Loading ───────────────────────────────────────────────────────────────────

function LoadingState() {
  const [step, setStep] = useState(0)
  const steps = [
    'Se încarcă meciurile zilei...',
    'AI analizează fiecare meci...',
    'Calculez Elo + formă + probabilități...',
    'Filtrare după confidence...',
  ]
  useEffect(() => {
    const t = setInterval(() => setStep(s => Math.min(s + 1, steps.length - 1)), 1800)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="card p-10 text-center">
      <div className="spinner mx-auto mb-6" />
      <div className="text-green-400 text-sm font-mono mb-1">{steps[step]}</div>
      <div className="text-gray-600 text-[11px] font-mono">Model XGBoost · 225K meciuri antrenament</div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DailyPage() {
  const [data, setData]       = useState<DailyResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<'all' | 'high'>('all')
  const [error, setError]     = useState('')

  useEffect(() => {
    fetch(`${API_BASE}/api/daily?min_confidence=0.45`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('Serverul nu răspunde. Reîncarcă pagina.'); setLoading(false) })
  }, [])

  const picks = data?.picks ?? []
  const shown = filter === 'high' ? picks.filter(p => p.high_confidence) : picks

  function shareText() {
    const top = shown.slice(0, 5)
    const lines = top.map((p, i) => {
      const pred = predLabel(p)
      return `${i + 1}. ${p.flag} ${p.home} vs ${p.away}\n   ${pred.short} — ${pred.full} · ${p.confidence}% conf`
    }).join('\n\n')
    return `🎯 FLOPI SAN — Pick-urile zilei ${formatDate(today())}\n\n${lines}\n\n🤖 Model AI · flopiforecastro.vercel.app`
  }

  return (
    <div className="app-bg grid-bg" style={{ minHeight: '100vh', overflowX: 'hidden' }}>

      {/* Header */}
      <header className="header">
        <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Flopi San" className="w-10 h-10 rounded-full object-cover border-2 border-green-500/60" />
            <div>
              <div className="font-display text-lg text-white tracking-widest leading-none">FLOPI SAN</div>
              <div className="text-[9px] font-mono text-green-400 tracking-[0.2em] uppercase">Forecast Academy</div>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            <a href="/" className="nav-link">Predicții AI</a>
            <a href="/daily" className="nav-link active">🎯 Selecțiile zilei</a>
            <a href="/weekly" className="nav-link">Rezultate</a>
          </nav>
        </div>
      </header>
      <div className="header-spacer" />

      <main className="max-w-2xl mx-auto px-4 py-8">

        {/* Hero */}
        <div className="text-center mb-6 fade-in">
          <div className="text-4xl mb-2">🎯</div>
          <h1 className="font-display text-4xl text-white mb-1" style={{ letterSpacing: '0.05em' }}>
            SELECȚIILE ZILEI
          </h1>
          <div className="text-green-400 text-sm font-mono uppercase tracking-widest mb-1">
            {data ? formatDate(data.date) : formatDate(today())}
            {data && data.date !== today() && (
              <span className="text-yellow-500 text-[10px] ml-2">(next matchday)</span>
            )}
          </div>
          <p className="text-gray-500 text-xs font-mono">
            XGBoost + Elo · 225K meciuri antrenament · Sorted by confidence
          </p>
        </div>

        {loading && <LoadingState />}
        {error && (
          <div className="card p-6 text-center text-red-400 font-mono text-sm">{error}</div>
        )}

        {!loading && !error && data && (
          <>
            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              {[
                { label: 'Meciuri analizate', val: data.total_fixtures, color: '#818cf8' },
                { label: 'Pick-uri active',   val: data.total_picks,    color: '#f59e0b' },
                { label: 'High confidence',   val: data.high_conf,      color: '#22c55e' },
              ].map(({ label, val, color }) => (
                <div key={label} className="card p-3 text-center">
                  <div className="text-2xl font-bold font-mono" style={{ color }}>{val}</div>
                  <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* 3 Ponturi Gratuite */}
            <FreePicks picks={picks} />

            {/* Filter tabs */}
            <div className="flex gap-2 mb-5">
              {[
                { key: 'all',  label: `Toate (${data.total_picks})` },
                { key: 'high', label: `⚡ High Conf (${data.high_conf})` },
              ].map(({ key, label }) => (
                <button key={key}
                  onClick={() => setFilter(key as any)}
                  className="flex-1 py-2 rounded-xl text-sm font-mono font-bold transition-all"
                  style={{
                    background: filter === key ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${filter === key ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    color: filter === key ? '#22c55e' : '#6b7280',
                  }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Accuracy info */}
            {filter === 'high' && data.high_conf > 0 && (
              <div className="mb-4 px-4 py-3 rounded-xl text-xs font-mono"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <span className="text-green-400 font-bold">⚡ High Confidence</span>
                <span className="text-gray-400 ml-2">= confidence &gt;= 60% · acuratețe reală ~70%+ pe backtesting 33K meciuri</span>
              </div>
            )}

            {/* Picks */}
            {shown.length === 0 ? (
              <div className="card p-10 text-center">
                <div className="text-4xl opacity-20 mb-3">📅</div>
                <div className="font-display text-xl text-gray-500 tracking-widest mb-2">
                  {filter === 'high' ? 'Niciun pick high-confidence azi' : 'Nu sunt meciuri disponibile azi'}
                </div>
                <div className="text-gray-600 text-sm font-mono">
                  {filter === 'high' ? 'Încearcă filtrul "Toate"' : 'Revino mai târziu sau a doua zi'}
                </div>
              </div>
            ) : (
              shown.map((pick, i) => <PickCard key={i} pick={pick} rank={i + 1} />)
            )}

            {/* Share */}
            {shown.length > 0 && (
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareText())}`, '_blank')}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)', color: 'white' }}>
                  📤 WhatsApp
                </button>
                <button
                  onClick={() => window.open(`https://t.me/share/url?url=flopiforecastro.vercel.app&text=${encodeURIComponent(shareText())}`, '_blank')}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg, #2AABEE, #229ED9)', color: 'white' }}>
                  ✈️ Telegram
                </button>
              </div>
            )}

            {/* Model info */}
            <div className="card p-5 mt-6">
              <div className="text-[10px] font-bold text-green-500 uppercase tracking-widest mb-3 text-center">
                ℹ️ Cum funcționează
              </div>
              <div className="space-y-2 text-xs text-gray-500 font-mono">
                <div className="flex items-start gap-2">
                  <span className="text-green-400 shrink-0">🤖</span>
                  <span>Model XGBoost antrenat pe 225,000 meciuri din 20+ ligi europene</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 shrink-0">📊</span>
                  <span>84 features: cote bookmakers, Elo per ligă, formă recentă, H2H, xG</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 shrink-0">⚡</span>
                  <span>High Confidence (&gt;=60%): ~70% acuratețe pe backtesting 33,572 meciuri</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gray-600 shrink-0">⚠️</span>
                  <span>Scop educațional. Nu reprezintă sfaturi financiare sau de pariuri.</span>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-green-900/30 mt-12 py-6">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs font-mono text-gray-700">
            Flopi San Forecast Academy — Scop educațional. Nu reprezintă sfaturi de pariuri.
          </p>
          <a href="/privacy" className="text-xs font-mono text-green-600 hover:text-green-400 mt-1 block">
            Politică de confidențialitate
          </a>
        </div>
      </footer>
    </div>
  )
}
