'use client'

import { useState, useEffect } from 'react'

interface TrackedMatch {
  id: string
  home: string
  away: string
  league: string
  flag: string
  date: string
  time: string
  prediction: string
  market: string
  home_win: number
  draw: number
  away_win: number
  result: 'correct' | 'wrong' | 'pending'
  addedAt: string
}

function loadMatches(): TrackedMatch[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem('fp_tracked_v2') || '[]') } catch { return [] }
}
function saveMatches(m: TrackedMatch[]) {
  localStorage.setItem('fp_tracked_v2', JSON.stringify(m))
}
function today() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth()+1).padStart(2,'0')
  const day = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${day}`
}
function fmtDate(d: string) {
  if (!d) return ''
  const [y,m,day] = d.split('-')
  return `${day}.${m}.${y}`
}
function dateLabel(d: string) {
  const t = today()
  const tmDate = new Date()
  tmDate.setDate(tmDate.getDate() + 1)
  const tm = `${tmDate.getFullYear()}-${String(tmDate.getMonth()+1).padStart(2,'0')}-${String(tmDate.getDate()).padStart(2,'0')}`
  const ydDate = new Date()
  ydDate.setDate(ydDate.getDate() - 1)
  const yd = `${ydDate.getFullYear()}-${String(ydDate.getMonth()+1).padStart(2,'0')}-${String(ydDate.getDate()).padStart(2,'0')}`
  if (d === t) return '📅 Azi'
  if (d === tm) return '📅 Mâine'
  if (d === yd) return '📅 Ieri'
  return `📅 ${fmtDate(d)}`
}
function groupByDate(matches: TrackedMatch[]) {
  const groups: Record<string, TrackedMatch[]> = {}
  for (const m of matches) {
    const d = m.date || 'fără dată'
    if (!groups[d]) groups[d] = []
    groups[d].push(m)
  }
  return groups
}

function rateColor(rate: number | null) {
  if (rate === null) return '#6b7280'
  return rate >= 60 ? '#10b981' : rate >= 45 ? '#f59e0b' : '#ef4444'
}

function RateBar({ label, correct, total, highlight }: { label: string; correct: number; total: number; highlight?: boolean }) {
  const rate = total > 0 ? Math.round((correct / total) * 100) : null
  const color = rateColor(rate)
  return (
    <div className={`rounded-xl p-4 ${highlight ? 'bg-blue-900/20 border border-blue-600/30' : 'bg-gray-800/40'}`}>
      <div className="flex justify-between items-center mb-2">
        <span className={`text-xs font-bold uppercase tracking-widest ${highlight ? 'text-blue-300' : 'text-gray-400'}`}>{label}</span>
        <span className="text-2xl font-bold font-mono" style={{ color: rate !== null ? color : '#4b5563' }}>
          {rate !== null ? `${rate}%` : '—'}
        </span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-1">
        {rate !== null && (
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${rate}%`, backgroundColor: color }} />
        )}
      </div>
      <div className="text-[10px] text-gray-600 font-mono">
        {total === 0 ? 'Niciun pronostic finalizat' : `${correct} corecte din ${total} finalizate`}
      </div>
    </div>
  )
}

function StatsPanel({ matches }: { matches: TrackedMatch[] }) {
  const yesterday = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  })()
  const todayStr  = today()

  // ── Total general ──
  const resolved     = matches.filter(m => m.result !== 'pending')
  const correct      = resolved.filter(m => m.result === 'correct').length
  const wrong        = resolved.filter(m => m.result === 'wrong').length
  const pending      = matches.filter(m => m.result === 'pending').length

  // ── Ieri (pronosticuri cu data de ieri, finalizate azi) ──
  const yesterdayAll      = matches.filter(m => m.date === yesterday)
  const yesterdayResolved = yesterdayAll.filter(m => m.result !== 'pending')
  const yesterdayCorrect  = yesterdayResolved.filter(m => m.result === 'correct').length

  // ── Azi (pronosticuri cu data de azi, finalizate) ──
  const todayAll      = matches.filter(m => m.date === todayStr)
  const todayResolved = todayAll.filter(m => m.result !== 'pending')
  const todayCorrect  = todayResolved.filter(m => m.result === 'correct').length

  if (matches.length === 0) return null

  return (
    <div className="space-y-4 mb-6">
      {/* Carduri cifre */}
      <div className="card p-5">
        <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3 text-center">
          📊 Statistici generale
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Total pronosticuri', value: matches.length, color: '#60a5fa' },
            { label: '✅ Corecte', value: correct, color: '#10b981' },
            { label: '❌ Greșite', value: wrong, color: '#ef4444' },
            { label: '⏳ Așteptare', value: pending, color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} className="bg-gray-800/50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Bare rate */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <RateBar
            label="🏆 Rată totală"
            correct={correct}
            total={resolved.length}
            highlight
          />
          <RateBar
            label={`📅 Selecțiile de ieri (${fmtDate(yesterday)})`}
            correct={yesterdayCorrect}
            total={yesterdayResolved.length}
          />
          <RateBar
            label={`📅 Selecțiile de azi (${fmtDate(todayStr)})`}
            correct={todayCorrect}
            total={todayResolved.length}
          />
        </div>

        {/* Streak */}
        {resolved.length >= 2 && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-800">
            <span className="text-[10px] text-gray-600 uppercase tracking-widest shrink-0">Ultimele 7:</span>
            <div className="flex gap-1">
              {[...resolved].slice(-7).map((m, i) => (
                <div key={i} className={`w-6 h-6 rounded text-xs flex items-center justify-center font-bold
                  ${m.result==='correct' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                  {m.result==='correct' ? '✓' : '✗'}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


function MatchCard({ match, onResult, onDelete }: {
  match: TrackedMatch
  onResult: (id: string, r: 'correct' | 'wrong' | 'pending') => void
  onDelete: (id: string) => void
}) {
  const isCorrect = match.result === 'correct'
  const isWrong   = match.result === 'wrong'
  const isPending = match.result === 'pending'
  return (
    <div className={`card p-4 mb-3 border-l-4 transition-all
      ${isCorrect ? 'border-l-emerald-500' : isWrong ? 'border-l-red-500' : 'border-l-blue-600'}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span>{match.flag}</span>
          <span className="text-[10px] text-gray-500 uppercase tracking-widest">{match.league}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-gray-600">
            {fmtDate(match.date)}{match.time ? ` · ${match.time}` : ''}
          </span>
          <button onClick={() => onDelete(match.id)}
            className="text-gray-700 hover:text-red-500 transition-colors text-xs">✕</button>
        </div>
      </div>
      <div className="flex items-center justify-center gap-3 mb-3">
        <span className="font-display text-white text-sm tracking-wide text-right flex-1">{match.home}</span>
        <span className="text-gray-600 font-mono text-xs">VS</span>
        <span className="font-display text-white text-sm tracking-wide flex-1">{match.away}</span>
      </div>
      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="text-[10px] text-gray-600 uppercase tracking-widest">Pronostic:</span>
        <span className="px-3 py-1 rounded-full bg-blue-600/20 border border-blue-600/30 text-blue-300 text-xs font-mono font-bold">
          {match.prediction}
        </span>
        <span className="text-[10px] text-gray-700">[{match.market}]</span>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onResult(match.id, isCorrect ? 'pending' : 'correct')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all
            ${isCorrect ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-500 hover:bg-emerald-900/40 hover:text-emerald-400 border border-gray-700'}`}>
          ✅ Corect
        </button>
        <button onClick={() => onResult(match.id, isWrong ? 'pending' : 'wrong')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all
            ${isWrong ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-500 hover:bg-red-900/40 hover:text-red-400 border border-gray-700'}`}>
          ❌ Greșit
        </button>
        {!isPending && (
          <button onClick={() => onResult(match.id, 'pending')}
            className="px-3 py-2 rounded-lg text-xs text-gray-600 hover:text-gray-400 bg-gray-800/50 border border-gray-800 transition-all"
            title="Resetează">↩</button>
        )}
      </div>
    </div>
  )
}

function AddModal({ onAdd, onClose }: { onAdd: (m: TrackedMatch) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    home: '', away: '', league: '', flag: '⚽',
    date: today(), time: '',
    prediction: '', market: '1X2',
  })
  const flagOptions: Record<string, string> = {
    '🏴󠁧󠁢󠁥󠁮󠁧󠁿': 'Premier League', '🇪🇸': 'La Liga', '🇩🇪': 'Bundesliga',
    '🇮🇹': 'Serie A', '🇫🇷': 'Ligue 1', '🏆': 'Champions League',
    '🥈': 'Europa League', '🥉': 'Conference League', '🇷🇴': 'Superliga',
    '🇵🇹': 'Primeira Liga', '🇳🇱': 'Eredivisie', '⚽': 'Altă ligă',
  }
  const markets = ['1X2','Over 2.5','Under 2.5','BTTS Da','BTTS Nu',
    'Șansă dublă 1X','Șansă dublă X2','Over 1.5','Over 3.5','Cornere +9.5','Alt pariu']

  function submit() {
    if (!form.home || !form.away || !form.prediction) return
    onAdd({
      id: Date.now().toString(),
      home: form.home, away: form.away,
      league: form.league || flagOptions[form.flag] || 'Ligă',
      flag: form.flag, date: form.date, time: form.time,
      prediction: form.prediction, market: form.market,
      home_win: 45, draw: 27, away_win: 28,
      result: 'pending', addedAt: today(),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-display text-lg text-white tracking-wide">+ Adaugă pronostic</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-white text-xl">✕</button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Ligă</label>
              <select className="select-styled text-sm" value={form.flag}
                onChange={e => setForm({...form, flag: e.target.value, league: flagOptions[e.target.value]||''})}>
                {Object.entries(flagOptions).map(([f,l]) => <option key={f} value={f}>{f} {l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Ligă (custom)</label>
              <input className="input-styled text-sm" value={form.league}
                onChange={e => setForm({...form, league: e.target.value})} placeholder="Premier League..." />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Echipă gazdă</label>
            <input className="input-styled" value={form.home}
              onChange={e => setForm({...form, home: e.target.value})} placeholder="Arsenal" />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Echipă oaspete</label>
            <input className="input-styled" value={form.away}
              onChange={e => setForm({...form, away: e.target.value})} placeholder="Chelsea" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Data</label>
              <input type="date" className="input-styled text-sm" value={form.date}
                onChange={e => setForm({...form, date: e.target.value})}
                min={new Date(Date.now()-30*86400000).toISOString().split('T')[0]} />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Ora</label>
              <input type="time" className="input-styled text-sm" value={form.time}
                onChange={e => setForm({...form, time: e.target.value})}
                placeholder="21:00" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Tip pariu</label>
            <select className="select-styled text-sm" value={form.market}
              onChange={e => setForm({...form, market: e.target.value})}>
              {markets.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Pronosticul tău</label>
            <input className="input-styled" value={form.prediction}
              onChange={e => setForm({...form, prediction: e.target.value})}
              placeholder="ex: Arsenal câștigă 58% | Over 2.5 — 67%" />
          </div>
        </div>
        <button onClick={submit} disabled={!form.home || !form.away || !form.prediction}
          className="btn-accent w-full mt-5 disabled:opacity-40 disabled:cursor-not-allowed">
          ✅ Adaugă pronostic
        </button>
      </div>
    </div>
  )
}

export default function Weekly() {
  const [matches, setMatches] = useState<TrackedMatch[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState<'all'|'pending'|'correct'|'wrong'>('all')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true); setMatches(loadMatches()) }, [])

  function addMatch(m: TrackedMatch) {
    const u = [m, ...matches]; setMatches(u); saveMatches(u)
  }
  function setResult(id: string, result: 'correct'|'wrong'|'pending') {
    const u = matches.map(m => m.id===id ? {...m, result} : m); setMatches(u); saveMatches(u)
  }
  function deleteMatch(id: string) {
    if (!confirm('Ștergi acest pronostic?')) return
    const u = matches.filter(m => m.id!==id); setMatches(u); saveMatches(u)
  }
  function clearAll() {
    if (!confirm('Ștergi toate pronosticurile?')) return
    setMatches([]); saveMatches([])
  }

  const filtered = filter==='all' ? matches : matches.filter(m => m.result===filter)
  const grouped = groupByDate(filtered)
  const sortedDates = Object.keys(grouped).sort((a,b) => b.localeCompare(a))

  if (!mounted) return null

  return (
    <div className="app-bg grid-bg min-h-screen">
      <header className="header">
        <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Flopi San" className="w-10 h-10 rounded-full object-cover border-2 border-blue-500/60" />
            <div>
              <div className="font-display text-lg text-white tracking-widest leading-none">FLOPI SAN</div>
              <div className="text-[9px] font-mono text-blue-400 tracking-[0.2em] uppercase">Forecast Academy</div>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            <a href="/" className="nav-link">Predicții</a>
            <a href="/weekly" className="nav-link active">Rezultate</a>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8 fade-in">
          <div className="flex justify-center mb-4">
            <img src="/logo.jpg" alt="Flopi San"
              className="w-20 h-20 rounded-full object-cover border-4 border-blue-600/50 shadow-2xl shadow-blue-900/60" />
          </div>
          <h1 className="font-display text-4xl sm:text-5xl text-white tracking-widest mb-1">EVIDENȚA PRONOSTICURILOR</h1>
          <div className="text-blue-400 text-xs font-mono uppercase tracking-[0.25em] mb-1">Flopi San · Forecast Academy</div>
          <p className="text-gray-600 text-xs font-mono uppercase tracking-widest">Urmărește rata de succes a predicțiilor tale</p>
        </div>

        <StatsPanel matches={matches} />

        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex gap-1 flex-wrap">
            {([
              {key:'all',label:'Toate'},
              {key:'pending',label:'⏳ Așteptare'},
              {key:'correct',label:'✅ Corecte'},
              {key:'wrong',label:'❌ Greșite'},
            ] as const).map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                  ${filter===f.key ? 'bg-blue-600 text-white' : 'bg-gray-800/60 text-gray-500 hover:text-gray-300 border border-gray-700/50'}`}>
                {f.label}
                <span className="ml-1 opacity-70 text-[10px]">
                  ({f.key==='all' ? matches.length : matches.filter(m=>m.result===f.key).length})
                </span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {matches.length>0 && (
              <button onClick={clearAll}
                className="px-3 py-1.5 rounded-lg text-xs text-gray-600 hover:text-red-400 bg-gray-800/50 border border-gray-800 transition-all">
                🗑 Șterge tot
              </button>
            )}
            <button onClick={() => setShowAdd(true)} className="btn-accent px-4 py-1.5 text-sm">
              + Adaugă pronostic
            </button>
          </div>
        </div>

        {sortedDates.length > 0 ? (
          sortedDates.map(date => (
            <div key={date} className="mb-6 fade-in">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-blue-900/30" />
                <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">{dateLabel(date)}</span>
                <span className="text-[10px] text-gray-700 font-mono">{grouped[date].length} meciuri</span>
                <div className="h-px flex-1 bg-blue-900/30" />
              </div>
              {grouped[date].map(m => (
                <MatchCard key={m.id} match={m} onResult={setResult} onDelete={deleteMatch} />
              ))}
            </div>
          ))
        ) : (
          <div className="text-center py-20 fade-in">
            <div className="text-6xl opacity-10 mb-4">📊</div>
            <p className="font-display text-xl text-gray-600 tracking-widest mb-2">
              {filter==='all' ? 'NICIUN PRONOSTIC ÎNREGISTRAT' : 'NICIUN PRONOSTIC'}
            </p>
            <p className="text-gray-700 text-sm font-mono mb-6">
              {filter==='all' ? 'Adaugă primul tău pronostic și urmărește-ți succesul' : 'Încearcă alt filtru'}
            </p>
            {filter==='all' && (
              <button onClick={() => setShowAdd(true)} className="btn-accent px-6 py-2">
                + Adaugă primul pronostic
              </button>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-blue-900/40 mt-12 py-6">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs font-mono text-gray-700">Flopi San Forecast Academy — Scop educațional. Nu reprezintă sfaturi de pariuri.</p>
        </div>
      </footer>

      {showAdd && <AddModal onAdd={addMatch} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
